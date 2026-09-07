/**
 * Automated Database Push & Sync Tool for BS Express & Fixed Asset System
 * Backs up MySQL bs_fix_assets, syncs to local MySQL bs_express_report,
 * and pushes schema & data to Cloudflare D1 (bs-express-db).
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TABLES_TO_SYNC = [
  'branches',
  'departments',
  'employees',
  'user_infos',
  'item_categories',
  'item_types',
  'item_masters',
  'item_fixed_asset_codes',
  'asset_assignments',
  'asset_assignment_items',
  'suppliers',
  'warehouses',
  'grns',
  'grn_items',
  'grn_approvals',
  'grn_status_histories',
  'type_of_works',
  'hikvision_devices',
  'roles',
  'users', // mapped to fixasset_users in D1 & bs_express_report
  'assets',
  'products'
];

function mapSqliteType(mysqlType) {
  const type = (mysqlType || '').toLowerCase();
  if (type.includes('int')) return 'INTEGER';
  if (type.includes('decimal') || type.includes('float') || type.includes('double') || type.includes('numeric')) return 'REAL';
  if (type.includes('blob')) return 'BLOB';
  return 'TEXT';
}

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) {
    return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }
  const str = String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

async function run() {
  console.log('====================================================');
  console.log('🚀 BS Express - Fixed Asset Database Push & Sync');
  console.log('====================================================\n');

  // 1. Connect to MySQL bs_fix_assets
  console.log('🔌 Step 1: Connecting to MySQL database bs_fix_assets...');
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'admin123',
    database: 'bs_fix_assets',
    charset: 'utf8mb4'
  });

  const outDir = path.resolve(__dirname, '../db');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 2. Generate D1 SQLite Schema
  console.log('📝 Step 2: Generating Cloudflare D1 SQLite schema...');
  let schemaSql = `-- Cloudflare D1 SQLite Schema for Fixed Asset System\n-- Generated on ${new Date().toISOString()}\n\n`;

  for (const table of TABLES_TO_SYNC) {
    const targetTable = table === 'users' ? 'fixasset_users' : table;
    const [cols] = await conn.query(`DESCRIBE \`${table}\``);

    const colDefs = [];
    const pkCols = [];

    for (const col of cols) {
      const fieldName = col.Field;
      const isAuto = col.Extra && col.Extra.toLowerCase().includes('auto_increment');
      const isPk = col.Key === 'PRI';
      const sqliteType = mapSqliteType(col.Type);

      if (isPk) pkCols.push(fieldName);

      let def = `  \`${fieldName}\` ${sqliteType}`;
      if (isPk && isAuto && pkCols.length === 1) {
        def += ' PRIMARY KEY AUTOINCREMENT';
      } else if (col.Null === 'NO' && !isPk) {
        def += ' NOT NULL';
      }
      colDefs.push(def);
    }

    if (pkCols.length > 1 || (pkCols.length === 1 && !cols.some(c => c.Key === 'PRI' && c.Extra.includes('auto_increment')))) {
      colDefs.push(`  PRIMARY KEY (\`${pkCols.join('`, `')}\`)`);
    }

    schemaSql += `CREATE TABLE IF NOT EXISTS \`${targetTable}\` (\n${colDefs.join(',\n')}\n);\n\n`;
  }

  const schemaPath = path.join(outDir, 'fixasset_d1_schema.sql');
  fs.writeFileSync(schemaPath, schemaSql, 'utf8');
  console.log('   ✓ Saved schema to db/fixasset_d1_schema.sql');

  // 3. Export Core Data
  console.log('📦 Step 3: Exporting core data records...');
  const coreTables = TABLES_TO_SYNC.filter(t => t !== 'item_fixed_asset_codes');
  let coreDataSql = `-- Fixed Asset Core Data Migration\n-- Generated on ${new Date().toISOString()}\n\n`;

  for (const table of coreTables) {
    const targetTable = table === 'users' ? 'fixasset_users' : table;
    const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
    if (!rows.length) continue;

    console.log(`   - ${table} (${rows.length} rows) -> ${targetTable}`);
    const colNames = Object.keys(rows[0]);
    const quotedCols = colNames.map(c => `\`${c}\``).join(', ');

    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const valuesList = batch.map(row => {
        const vals = colNames.map(col => escapeSqlValue(row[col]));
        return `(${vals.join(', ')})`;
      }).join(',\n  ');

      coreDataSql += `INSERT OR REPLACE INTO \`${targetTable}\` (${quotedCols}) VALUES\n  ${valuesList};\n\n`;
    }
  }

  const coreDataPath = path.join(outDir, 'fixasset_d1_core_data.sql');
  fs.writeFileSync(coreDataPath, coreDataSql, 'utf8');
  console.log('   ✓ Saved core data to db/fixasset_d1_core_data.sql');

  // 4. Export Item Fixed Asset Codes in Chunks
  console.log('🏷️  Step 4: Exporting item fixed asset codes (7,000+ records)...');
  const [assetCodes] = await conn.query('SELECT * FROM `item_fixed_asset_codes` ORDER BY id ASC');
  console.log(`   - Found ${assetCodes.length} asset codes`);

  const chunkSize = 2500;
  const codeFiles = [];
  for (let part = 0; part < Math.ceil(assetCodes.length / chunkSize); part++) {
    const partRows = assetCodes.slice(part * chunkSize, (part + 1) * chunkSize);
    let assetSql = `-- Fixed Asset Codes Part ${part + 1}\n-- Generated on ${new Date().toISOString()}\n\n`;
    const colNames = Object.keys(partRows[0]);
    const quotedCols = colNames.map(c => `\`${c}\``).join(', ');

    const batchSize = 50;
    for (let i = 0; i < partRows.length; i += batchSize) {
      const batch = partRows.slice(i, i + batchSize);
      const valuesList = batch.map(row => {
        const vals = colNames.map(col => escapeSqlValue(row[col]));
        return `(${vals.join(', ')})`;
      }).join(',\n  ');

      assetSql += `INSERT OR REPLACE INTO \`item_fixed_asset_codes\` (${quotedCols}) VALUES\n  ${valuesList};\n\n`;
    }

    const filePath = path.join(outDir, `fixasset_d1_codes_part${part + 1}.sql`);
    fs.writeFileSync(filePath, assetSql, 'utf8');
    codeFiles.push(filePath);
    console.log(`   ✓ Saved part ${part + 1} (${partRows.length} rows)`);
  }

  // 5. Sync to local MySQL bs_express_report
  console.log('\n🔄 Step 5: Syncing all tables into local MySQL bs_express_report...');
  try {
    const [allTables] = await conn.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
    for (const t of allTables) {
      const srcTable = Object.values(t)[0];
      const targetTable = srcTable === 'users' ? 'fixasset_users' : srcTable;

      await conn.query(`CREATE TABLE IF NOT EXISTS \`bs_express_report\`.\`${targetTable}\` LIKE \`bs_fix_assets\`.\`${srcTable}\``);
      const [[{ count }]] = await conn.query(`SELECT COUNT(*) as count FROM \`bs_express_report\`.\`${targetTable}\``);
      if (count === 0) {
        await conn.query(`INSERT INTO \`bs_express_report\`.\`${targetTable}\` SELECT * FROM \`bs_fix_assets\`.\`${srcTable}\``);
        console.log(`   ✓ Synced table: bs_express_report.${targetTable}`);
      }
    }
  } catch (syncErr) {
    console.warn('   ⚠️  Local MySQL sync warning:', syncErr.message);
  }

  await conn.end();

  // 6. Push to Cloudflare D1
  console.log('\n☁️  Step 6: Pushing to Cloudflare D1 Remote Database (bs-express-db)...');
  const d1Files = [
    'db/fixasset_d1_schema.sql',
    'db/fixasset_d1_core_data.sql',
    'db/fixasset_d1_codes_part1.sql',
    'db/fixasset_d1_codes_part2.sql',
    'db/fixasset_d1_codes_part3.sql'
  ];

  for (const relFile of d1Files) {
    console.log(`   🚀 Uploading & executing ${relFile} on D1...`);
    try {
      execSync(`npx wrangler d1 execute bs-express-db --remote --file=${relFile}`, { stdio: 'inherit' });
    } catch (e) {
      console.error(`   ❌ Failed to execute ${relFile} on D1:`, e.message);
    }
  }

  console.log('\n====================================================');
  console.log('✅ ALL DONE! Database successfully pushed to Cloudflare D1 and MySQL!');
  console.log('====================================================\n');
}

run().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});

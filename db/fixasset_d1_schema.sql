-- Cloudflare D1 / SQLite Schema for Fixed Asset System
-- Generated on 2026-09-07T05:00:33.867Z

CREATE TABLE IF NOT EXISTS `branches` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `name` TEXT,
  `name_en` TEXT,
  `label` TEXT,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `departments` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `name` TEXT,
  `name_en` TEXT,
  `label` TEXT,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `employees` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `employee_code` TEXT,
  `employee_name` TEXT,
  `department_id` INTEGER,
  `branch_id` INTEGER,
  `job_title` TEXT,
  `phone_number` TEXT,
  `date_of_hired` TEXT,
  `date_of_contract` TEXT,
  `email` TEXT,
  `current_address` TEXT,
  `status` TEXT NOT NULL,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `user_infos` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `hikvision_device_id` INTEGER NOT NULL,
  `employee_no` TEXT NOT NULL,
  `name` TEXT NOT NULL,
  `user_type` TEXT NOT NULL,
  `is_enabled` INTEGER NOT NULL,
  `valid_from` TEXT,
  `valid_to` TEXT,
  `face_photo_url` TEXT,
  `face_photo_path` TEXT,
  `face_count` INTEGER NOT NULL,
  `fingerprint_count` INTEGER NOT NULL,
  `last_synced_at` TEXT,
  `device_data` TEXT,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `item_categories` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `name` TEXT NOT NULL,
  `name_en` TEXT,
  `label` TEXT,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `item_types` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `name` TEXT NOT NULL,
  `name_en` TEXT,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `item_masters` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `code` TEXT,
  `name` TEXT,
  `model` TEXT,
  `item_type_id` INTEGER,
  `description` TEXT,
  `category_id` INTEGER,
  `quantity` INTEGER,
  `unit_price` INTEGER,
  `total_price` INTEGER,
  `is_new` INTEGER NOT NULL,
  `is_secondhand` INTEGER NOT NULL,
  `unit_of_measure` TEXT,
  `brand` TEXT,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `balance_update_count` INTEGER NOT NULL,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `item_fixed_asset_codes` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `item_master_id` INTEGER NOT NULL,
  `grn_id` INTEGER,
  `code` TEXT NOT NULL,
  `a_code` TEXT,
  `is_assigned` INTEGER NOT NULL,
  `assigned_to` TEXT,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `asset_assignments` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `assignment_no` TEXT NOT NULL,
  `employee_id` INTEGER,
  `assign_date` TEXT NOT NULL,
  `return_date` TEXT,
  `notes` TEXT,
  `status` TEXT NOT NULL,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `asset_assignment_items` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `assignment_id` INTEGER NOT NULL,
  `item_master_id` INTEGER,
  `item_code` TEXT,
  `product_name` TEXT,
  `description` TEXT,
  `brand` TEXT,
  `quantity` INTEGER NOT NULL,
  `asset_code` TEXT,
  `reference_no` TEXT,
  `condition` TEXT NOT NULL,
  `remark` TEXT,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `name` TEXT NOT NULL,
  `address` TEXT,
  `phone` TEXT,
  `email` TEXT,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `warehouses` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `name` TEXT NOT NULL,
  `branch_id` INTEGER,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `grns` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `grn_number` TEXT NOT NULL,
  `grn_type` TEXT NOT NULL,
  `transaction_date` TEXT NOT NULL,
  `supplier_id` INTEGER,
  `reference_no` TEXT,
  `po_number` TEXT,
  `warehouse_id` INTEGER,
  `type_of_work` TEXT,
  `qr_code` TEXT,
  `file_name` TEXT,
  `note` TEXT,
  `status` TEXT NOT NULL,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `grn_items` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `grn_id` INTEGER NOT NULL,
  `item_master_id` INTEGER,
  `item_code` TEXT,
  `description` TEXT,
  `brand` TEXT,
  `po_quantity` INTEGER NOT NULL,
  `uom` TEXT,
  `receive_quantity` INTEGER NOT NULL,
  `unit_price` INTEGER,
  `total_amount` INTEGER,
  `remark` TEXT,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `grn_approvals` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `grn_id` INTEGER NOT NULL,
  `role` TEXT,
  `approver_name` TEXT,
  `user_id` INTEGER,
  `status` TEXT NOT NULL,
  `comment` TEXT,
  `approved_at` TEXT,
  `sort_order` INTEGER NOT NULL,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `grn_status_histories` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `grn_id` INTEGER NOT NULL,
  `status` TEXT NOT NULL,
  `action_by` INTEGER,
  `comment` TEXT,
  `created_at` TEXT
);

CREATE TABLE IF NOT EXISTS `type_of_works` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `name` TEXT NOT NULL,
  `name_en` TEXT,
  `label` TEXT,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `hikvision_devices` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `name` TEXT NOT NULL,
  `host` TEXT NOT NULL,
  `port` INTEGER NOT NULL,
  `protocol` TEXT NOT NULL,
  `username` TEXT NOT NULL,
  `password` TEXT NOT NULL,
  `serial_number` TEXT,
  `model` TEXT,
  `firmware_version` TEXT,
  `is_connected` INTEGER NOT NULL,
  `last_connected_at` TEXT,
  `last_error` TEXT,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `roles` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `name` TEXT,
  `name_en` TEXT,
  `label` TEXT,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `fixasset_users` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `user_login` TEXT,
  `name` TEXT NOT NULL,
  `name_en` TEXT,
  `gender` TEXT,
  `date_of_birth` TEXT,
  `place_of_birth` TEXT,
  `status` TEXT NOT NULL,
  `role_id` INTEGER,
  `is_superadmin` INTEGER NOT NULL,
  `phone_number` TEXT,
  `created_by` INTEGER,
  `updated_by` INTEGER,
  `email` TEXT,
  `email_verified_at` TEXT,
  `password` TEXT NOT NULL,
  `two_factor_secret` TEXT,
  `two_factor_recovery_codes` TEXT,
  `two_factor_confirmed_at` TEXT,
  `remember_token` TEXT,
  `created_at` TEXT,
  `updated_at` TEXT
);

CREATE TABLE IF NOT EXISTS `assets` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `asset_code` TEXT,
  `alt_code` TEXT,
  `product_id` INTEGER NOT NULL,
  `employee_code` TEXT,
  `assignment_no` TEXT,
  `assign_date` TEXT,
  `assignment_status` TEXT,
  `created_at` TEXT
);

CREATE TABLE IF NOT EXISTS `products` (
  `product_id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `product_name` TEXT NOT NULL
);


-- Cloudflare D1 Seed Script (Admin Users Only + Sample Reports)
-- Database: bs-express-db (Cloudflare APAC)

-- Admin Users (Password: 123)
INSERT OR REPLACE INTO users (id, username, password, full_name, role, branch, phone, created_at) 
VALUES ('user_vid', 'vid', '123', 'Vid (System Admin)', 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)', 'ការិយាល័យកណ្ដាល', '010 888 999', '2026-09-04 08:03:26');

INSERT OR REPLACE INTO users (id, username, password, full_name, role, branch, phone, created_at) 
VALUES ('user_admin_root', 'admin', '123', 'System Administrator', 'System Administrator (គ្រប់គ្រងប្រព័ន្ធ)', 'ការិយាល័យកណ្ដាល', '010 888 999', '2026-09-04 08:02:02');

INSERT OR REPLACE INTO users (id, username, password, full_name, role, branch, phone, created_at) 
VALUES ('user_rithjengdavid', 'rithjengdavid', '123', 'Rith Jeng David', 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (System Administrator)', 'ការិយាល័យកណ្តាល', '010 888 999', '2026-09-04 08:25:48');

INSERT OR REPLACE INTO users (id, username, password, full_name, role, branch, phone, created_at) 
VALUES ('user_sysadmin', 'sysadmin', '123', 'System Administrator', 'System Administrator (គ្រប់គ្រងប្រព័ន្ធ)', 'ការិយាល័យកណ្ដាល', '010 888 999', '2026-09-04 08:02:02');

INSERT OR REPLACE INTO users (id, username, password, full_name, role, branch, phone, created_at) 
VALUES ('user_1787124671318', 'vif', '123', 'vif', 'គណៈគ្រប់គ្រងជាន់ខ្ពស់ (Top Management)', 'ការិយាល័យកណ្តាល', '123', '2026-08-19 07:31:11');

-- Sample Reports
INSERT OR REPLACE INTO reports (id, branch, date, date_display, reporter_name, position, opening_time, present_count, absent_count, cleanliness_status, opening_photos, work_status, operation_challenges, accomplished_tasks, unresolved_issues, issues, package_security, closing_time, closing_photos, status, approval_status, created_at) 
VALUES ('report_sample_kratie', 'ក្រចេះ', '2026-09-04', '4/9/2026', 'ប៊ុនតា ភឿន', 'ប្រធានសាខា', '06:00 AM', 14, '1', 'ស្ថានភាពអនាម័យ និងភាពរៀបរយក្នុង-ក្រៅសាខា', '[]', 'បញ្ញើរអីវ៉ាន់ សម្រាប់ភ្ញៀវVIP និងកំពុងស្វែងរកភ្ញៀវបន្ថែម', 'អីវ៉ាន់ដឹកអត់ដល់ កង់បីអស់ថ្ម អីវ៉ាន់ខ្លះសល់ទុកដឹកស្អែក', 'ដោះស្រាយអីវ៉ាន់ដែលដឹកអត់ដល់ និងសម្រួលដឹកអីវ៉ាន់ដែលជាប់ខូច', 'អីវ៉ាន់ដឹកអត់ដល់ទុកដឹកស្អែក', '[]', 'អីវ៉ាន់ដែលនៅសល់ទុកដាក់នៅកន្លែងមានផាសុខភាព និងមិនសើម', '11:00 PM', '[]', 'completed', 'pending', '2026-09-04 08:03:26');

INSERT OR REPLACE INTO reports (id, branch, date, date_display, reporter_name, position, opening_time, present_count, absent_count, cleanliness_status, opening_photos, work_status, operation_challenges, accomplished_tasks, unresolved_issues, issues, package_security, closing_time, closing_photos, status, approval_status, created_at) 
VALUES ('report_sample_headoffice', 'ការិយាល័យកណ្តាល', '2026-09-04', '4/9/2026', 'ជា សុភ័ក្រ្ត', 'ប្រធានសាខា', '07:00 AM', 45, '1', 'អនាម័យស្អាតល្អទាំងក្នុង និងក្រៅការិយាល័យកណ្តាល', '[]', 'ប្រតិបត្តិការទូទាំងរាជធានីភ្នំពេញដំណើរការយ៉ាងរលូន', 'គ្មាន', 'បញ្ជូនអីវ៉ាន់ VIP ទៅសាខាខេត្តបានទាន់ពេល ត្រួតពិនិត្យប្រព័ន្ធ Server', 'គ្មាន', '[]', 'ឃ្លាំងកណ្តាលមានសុវត្ថិភាព 100%', '08:00 PM', '[]', 'completed', 'approved', '2026-09-04 08:03:26');

INSERT OR REPLACE INTO reports (id, branch, date, date_display, reporter_name, position, opening_time, present_count, absent_count, cleanliness_status, opening_photos, work_status, operation_challenges, accomplished_tasks, unresolved_issues, issues, package_security, closing_time, closing_photos, status, approval_status, created_at) 
VALUES ('report_sample_siemreap', 'សៀមរាប', '2026-09-04', '4/9/2026', 'សៀមរាប បុគ្គលិក', 'បុគ្គលិកប្រតិបត្តិការ', '07:30 AM', 18, '0', 'អនាម័យល្អ', '[]', 'ការងារដំណើរការល្អ ទទួលភ្ញៀវទេសចរច្រើន', 'គ្មាន', 'ចែកចាយទំនិញបាន 220 កញ្ចប់', 'គ្មាន', '[]', 'ឃ្លាំងមានសុវត្ថិភាពល្អ', '07:30 PM', '[]', 'completed', 'pending', '2026-09-04 08:03:26');

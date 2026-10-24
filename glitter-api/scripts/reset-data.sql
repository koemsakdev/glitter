-- =============================================================================
--  Glitter — reset test data, KEEP the catalog
--
--  KEPT:    branches, categories, brands, colors, badges,
--           products (+ variants, images, badges, related products),
--           inventory (stock per branch),
--           store settings (app_settings, payment_config, menu_items, pages)
--  CLEARED: every user (incl. admins), orders, payments, shipments,
--           promotions, reviews, wishlists, notifications, banners, ads,
--           audit log, sign-in log, security alerts, IP blocks
--
--  Then start the API. It will:
--    1. create the admin from SEED_ADMIN_* in .env
--    2. record every kept catalog record as "created by" that admin
--       (only because the audit log is empty — later starts skip this)
--    3. re-install the audit-log protection
--
--  THIS CANNOT BE UNDONE. Create a Neon branch (backup) first.
--  Run:  psql "$DATABASE_URL" -f scripts/reset-data.sql
-- =============================================================================

BEGIN;

-- The audit log refuses TRUNCATE by design; the API re-installs this guard
-- on its next start.
DROP TRIGGER IF EXISTS audit_logs_no_truncate ON audit_logs;
DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs;
DROP TRIGGER IF EXISTS security_alerts_guard ON security_alerts;

-- Empty every table that isn't kept (skips tables this database doesn't have).
DO $$
DECLARE
    t text;
    keep text[] := ARRAY[
        'branches', 'categories', 'brands', 'colors', 'badges',
        'products', 'product_variants', 'product_images',
        'product_badges', 'related_products', 'inventory_branch',
        -- Store settings. Remove these four names to clear them too
        -- (logo/theme/contact, ABA payment setup, menu, pages).
        'app_settings', 'payment_config', 'menu_items', 'pages'
    ];
BEGIN
    FOR t IN
        SELECT tablename FROM pg_tables
         WHERE schemaname = 'public' AND NOT (tablename = ANY (keep))
    LOOP
        EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', t);
    END LOOP;
END $$;

-- Stock reserved for the deleted orders goes back to available.
-- (The variant/product totals already include reserved units, so they stay right.)
UPDATE inventory_branch
   SET quantity_available = quantity_available + quantity_reserved,
       quantity_reserved  = 0
 WHERE quantity_reserved > 0;

-- Reviews are gone, so products have no ratings yet.
UPDATE products SET average_rating = 0, review_count = 0;

COMMIT;

-- Check: kept tables still have rows, cleared ones are empty.
SELECT 'products' AS t, COUNT(*) FROM products
UNION ALL SELECT 'brands', COUNT(*) FROM brands
UNION ALL SELECT 'branches', COUNT(*) FROM branches
UNION ALL SELECT 'inventory_branch', COUNT(*) FROM inventory_branch
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs;

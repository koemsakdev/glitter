-- =============================================================================
--  Glitter — reset business data (development / testing only)
--
--  Empties every table EXCEPT the store's own setup:
--    app_settings, payment_config, menu_items, pages
--
--  After running it, restart the API:
--    • the first admin is re-created from SEED_ADMIN_* in .env
--      (sign in with username "admin" and SEED_ADMIN_PASSWORD)
--    • the audit-log protection triggers are re-installed
--    • TypeORM recreates nothing — the tables stay, only the rows go
--
--  THIS CANNOT BE UNDONE. Take a Neon branch / backup first.
--  Run with:  psql "$DATABASE_URL" -f scripts/reset-data.sql
-- =============================================================================

BEGIN;

-- The audit log refuses TRUNCATE by design; lift the guard for this reset.
-- (The API puts it back on its next start.)
DROP TRIGGER IF EXISTS audit_logs_no_truncate ON audit_logs;
DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs;
DROP TRIGGER IF EXISTS security_alerts_guard ON security_alerts;

TRUNCATE TABLE
    -- people & sign-in
    users,
    auth_accounts,
    staff,
    addresses,
    customer_phones,
    -- catalog
    branches,
    brands,
    categories,
    colors,
    badges,
    products,
    product_variants,
    product_images,
    product_badges,
    related_products,
    inventory_branch,
    -- sales
    orders,
    order_items,
    payments,
    shipments,
    vouchers,
    reviews,
    wishlists,
    wishlist_items,
    notifications,
    -- storefront content
    banners,
    banner_placements,
    advertisements,
    ad_placements,
    -- security & audit
    audit_logs,
    login_attempts,
    security_alerts,
    ip_blocks
RESTART IDENTITY CASCADE;

COMMIT;

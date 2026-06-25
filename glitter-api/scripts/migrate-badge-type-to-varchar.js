/**
 * One-time migration: convert product_badges.badge_type from a Postgres enum
 * to varchar so badges can become a dynamic, user-managed catalog.
 *
 * Safe to run multiple times (idempotent). Run with: node scripts/migrate-badge-type-to-varchar.js
 */
require('dotenv').config();
const { Client } = require('pg');

(async () => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    try {
        const { rows } = await client.query(
            `SELECT data_type, udt_name
               FROM information_schema.columns
              WHERE table_name = 'product_badges' AND column_name = 'badge_type'`,
        );
        if (rows.length === 0) {
            console.log('product_badges.badge_type not found — nothing to do.');
            return;
        }
        console.log('Current type:', rows[0].data_type, `(${rows[0].udt_name})`);
        if (rows[0].data_type !== 'USER-DEFINED') {
            console.log('Already varchar — nothing to do.');
            return;
        }
        const enumName = rows[0].udt_name;
        await client.query(
            `ALTER TABLE product_badges
                ALTER COLUMN badge_type TYPE varchar(50) USING badge_type::text`,
        );
        console.log('✓ Converted badge_type to varchar(50)');
        await client.query(`DROP TYPE IF EXISTS "${enumName}"`);
        console.log('✓ Dropped orphaned enum type', enumName);
    } finally {
        await client.end();
    }
})().catch((e) => {
    console.error('Migration failed:', e.message);
    process.exit(1);
});

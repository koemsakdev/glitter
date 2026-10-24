/**
 * Runs scripts/reset-data.sql against DATABASE_URL from .env.
 *   npm run db:reset -- --yes
 * Refuses to run without --yes (it permanently deletes data).
 */
/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

if (!process.argv.includes('--yes')) {
    console.error('This permanently deletes data. Re-run with --yes to confirm:');
    console.error('  npm run db:reset -- --yes');
    process.exit(1);
}

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const url = (env.match(/^DATABASE_URL=['"]?([^'"\n]+)/m) || [])[1];
if (!url) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}
const sql = fs.readFileSync(path.join(__dirname, 'reset-data.sql'), 'utf8');

(async () => {
    const client = new Client({ connectionString: url });
    await client.connect();
    console.log('Database:', url.replace(/\/\/[^@]+@/, '//***@'));
    try {
        const results = await client.query(sql);
        const last = Array.isArray(results) ? results[results.length - 1] : results;
        console.log('Done. Row counts now:');
        console.table(last.rows);
        console.log('Next: start the API (npm run start:dev).');
    } catch (e) {
        console.error('Reset failed — nothing was changed:', e.message);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
})();

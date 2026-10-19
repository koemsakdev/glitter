/**
 * Glitter — send emails from YOUR Gmail account (free, ~100/day).
 *
 * Why: the API's host (Render free plan) blocks outgoing SMTP, but it can call
 * HTTPS. This script runs on Google's side under your Google account, so mail
 * comes from your own Gmail address.
 *
 * Setup (once, ~3 minutes):
 *  1. Go to https://script.google.com → New project. Paste this whole file.
 *  2. Change SECRET below to a long random string (keep it private).
 *  3. Deploy → New deployment → type "Web app":
 *       Execute as: Me
 *       Who has access: Anyone
 *     → Deploy → Authorize (allow sending email as you) → copy the Web app URL.
 *  4. On the API (Render + local .env) set:
 *       GMAIL_SCRIPT_URL=<that URL, ends with /exec>
 *       GMAIL_SCRIPT_SECRET=<the same SECRET>
 *       MAIL_FROM_NAME=Glitter Shop
 *  5. Redeploy / restart the API.
 *
 * If you edit this script later: Deploy → Manage deployments → edit → New
 * version (the URL stays the same).
 */
const SECRET = 'CHANGE-ME-to-a-long-random-string';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.secret !== SECRET) return json({ ok: false, error: 'unauthorized' });
    if (!data.to || !data.subject) return json({ ok: false, error: 'missing to/subject' });

    GmailApp.sendEmail(data.to, data.subject, data.text || '', {
      htmlBody: data.html || undefined,
      name: data.name || 'Glitter Shop',
    });
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

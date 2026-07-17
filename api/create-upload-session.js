// api/create-upload-session.js
//
// Deploy this as a serverless function (Vercel: drop it in an /api folder at
// your project root and it just works. Netlify: see README for the small
// wrapper needed). It never touches file bytes — it just asks Google Drive
// to open an upload "session" and hands the fan's browser the URL to upload
// straight to. The video/photo bytes never pass through your server.
//
// Required environment variables (set these in your hosting dashboard):
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   GOOGLE_REFRESH_TOKEN
//   DRIVE_FOLDER_ID
//
// See README.md for how to get each of these.

const { OAuth2Client } = require('google-auth-library');

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

module.exports = async (req, res) => {
  // Basic CORS handling so this can be called from a different domain than
  // where it's hosted (e.g. an embed on your main site).
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { filename, mimeType, size, submitter, handle, note } = body || {};

    if (!filename) {
      res.status(400).json({ error: 'filename is required' });
      return;
    }
    if (!process.env.DRIVE_FOLDER_ID) {
      res.status(500).json({ error: 'DRIVE_FOLDER_ID is not configured' });
      return;
    }

    const { token } = await oauth2Client.getAccessToken();
    if (!token) {
      res.status(500).json({ error: 'Could not obtain Google access token' });
      return;
    }

    // Build a short description so every file in Drive is self-documenting,
    // even without opening a spreadsheet.
    const descriptionParts = [];
    if (submitter) descriptionParts.push(`From: ${submitter}`);
    if (handle) descriptionParts.push(`Handle: ${handle}`);
    if (note) descriptionParts.push(`Note: ${note}`);
    descriptionParts.push(`Uploaded: ${new Date().toISOString()}`);

    const originHeader = req.headers['origin'] || req.headers['Origin'];

    const driveRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType || 'application/octet-stream',
          ...(size ? { 'X-Upload-Content-Length': String(size) } : {}),
          // Forwarding Origin here is what lets Google allow the browser's
          // later PUT requests (from this same origin) to hit the session
          // URL directly, without your server relaying every byte.
          ...(originHeader ? { Origin: originHeader } : {})
        },
        body: JSON.stringify({
          name: filename,
          parents: [process.env.DRIVE_FOLDER_ID],
          description: descriptionParts.join(' | ')
        })
      }
    );

    if (!driveRes.ok) {
      const errText = await driveRes.text();
      res.status(502).json({ error: 'Drive session creation failed', detail: errText });
      return;
    }

    const uploadUrl = driveRes.headers.get('location');
    if (!uploadUrl) {
      res.status(502).json({ error: 'Drive did not return an upload session URL' });
      return;
    }

    res.status(200).json({ uploadUrl });
  } catch (err) {
    res.status(500).json({ error: 'Unexpected server error', detail: String(err) });
  }
};

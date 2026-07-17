// get-refresh-token.js
//
// Run this ONCE, locally, on your own computer, logged in with the Google
// account that owns the Drive you want fan uploads to land in.
//
// Usage:
//   1. npm install google-auth-library
//   2. node get-refresh-token.js
//   3. Copy the URL it prints into your browser, sign in with the band's
//      Google account, and approve access.
//   4. The refresh token is printed in your terminal. Copy it into your
//      hosting environment variables as GOOGLE_REFRESH_TOKEN.
//
// You only ever need to do this once, unless you revoke access later.

const { OAuth2Client } = require('google-auth-library');
const http = require('http');
const url = require('url');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'PASTE_YOUR_CLIENT_ID_HERE';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'PASTE_YOUR_CLIENT_SECRET_HERE';
const REDIRECT_URI = 'http://localhost:3999/oauth2callback';

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // forces a refresh_token to be issued even on repeat runs
  scope: ['https://www.googleapis.com/auth/drive.file']
});

const server = http.createServer(async (req, res) => {
  const qs = new url.URL(req.url, REDIRECT_URI).searchParams;
  const code = qs.get('code');
  if (!code) {
    res.end('No code received. You can close this tab.');
    return;
  }
  const { tokens } = await oauth2Client.getToken(code);
  res.end('Success! You can close this tab and check your terminal.');
  server.close();

  console.log('\n=== Copy this into your hosting env vars as GOOGLE_REFRESH_TOKEN ===\n');
  console.log(tokens.refresh_token);
  console.log('\n======================================================================\n');
});

server.listen(3999, () => {
  console.log('\nOpen this URL in your browser and sign in with your band\'s Google account:\n');
  console.log(authUrl);
  console.log('');
});

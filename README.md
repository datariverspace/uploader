# Fan Upload → Google Drive

A branded page where fans drop in photos/videos, which land in your Drive
folder at full original quality. Files go straight from the fan's browser to
Google — your server just hands out permission slips, so it stays cheap and
fast even for big video files.

**Files in here:**
- `index.html` — the page fans see. Fully self-contained (styles + logic).
- `api/create-upload-session.js` — the one backend function this needs.
- `get-refresh-token.js` — a script you run once, yourself, to connect your
  Google account.
- `package.json` — the one dependency the backend function needs.
- `privacy.html` / `terms.html` — pages required to publish your Google
  OAuth app (see Part 5 below).

---

## Part 1 — Google Cloud setup (~10 minutes, one-time)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and
   create a new project (any name, e.g. "Fan Uploads").
2. In the sidebar, go to **APIs & Services → Library**, search **Google
   Drive API**, and click **Enable**.
3. Go to **APIs & Services → OAuth consent screen**.
   - User type: **External**.
   - Fill in an app name (e.g. your band name) and your contact email.
   - Add the scope `https://www.googleapis.com/auth/drive.file`.
   - Under **Test users**, add the Google account (Gmail) whose Drive you
     want files to land in — this is almost always your own band account.
   - You can leave the app in "Testing" mode for now — see Part 5 for why
     you'll want to move it to Production once things are working.
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth
   client ID**.
   - Application type: **Desktop app**.
   - Give it any name, click Create.
   - Copy the **Client ID** and **Client Secret** — you'll need both.
5. In Google Drive, create (or pick) the folder fan uploads should land in,
   open it, and copy the folder ID out of the URL:
   `https://drive.google.com/drive/folders/`**`THIS_PART_IS_THE_ID`**

## Part 2 — Get your refresh token (one-time, run on your own computer)

This step connects the backend to your Google account so it's allowed to
drop files into your Drive, without your Google password ever being stored
anywhere.

```bash
npm install google-auth-library
GOOGLE_CLIENT_ID="your client id" GOOGLE_CLIENT_SECRET="your client secret" node get-refresh-token.js
```

It'll print a URL — open that in your browser, sign in with your band's
Google account, and approve access. Your terminal will then print a
**refresh token**. Save it somewhere safe; you'll paste it into your
hosting provider next.

**Note:** while your OAuth app is still in "Testing" mode, this refresh
token will expire after 7 days and you'll need to repeat this step. Part 5
below covers publishing the app so this stops happening.

## Part 3 — Deploy

The easiest path is **Vercel** (free tier is plenty for this):

1. Push this folder to a GitHub repo, then import it at
   [vercel.com/new](https://vercel.com/new) — Vercel auto-detects the
   `api/` folder as serverless functions.
2. In the Vercel project's **Settings → Environment Variables**, add:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REFRESH_TOKEN` (from Part 2)
   - `DRIVE_FOLDER_ID` (from Part 1, step 5)
3. Deploy. Vercel gives you a URL like `fan-uploads.vercel.app` — that's
   your fully working page.

(Netlify and Cloudflare Pages work too — the only difference is how the
`api/` function is wired up. Ask me if you want the Netlify version instead.)

## Part 4 — Go live

- **Linktree**: add your Vercel URL as a link — done.
- **Your website**: either link to it directly, or embed it in an iframe:
  ```html
  <iframe src="https://fan-uploads.vercel.app" style="width:100%; height:900px; border:0;"></iframe>
  ```
- **Custom domain**: Vercel lets you point something like
  `upload.yourbandname.com` at this for free, if you'd rather not show a
  `.vercel.app` URL.

## Part 5 — Privacy Policy & Terms (needed to publish the OAuth app)

When you publish your Google OAuth consent screen from **Testing** to
**Production** — which you want to do, since Testing-mode refresh tokens
expire every 7 days — Google requires a live, public **Privacy Policy**
link for any app requesting a non-basic scope, which `drive.file` counts
as. A Terms of Service link isn't strictly required for this scope, but
it's good practice to have one, and Google gives you the field anyway.

**What Google actually checks:**
- The link must be a real, publicly accessible page — not behind a login,
  not a PDF download, not a placeholder.
- It must be hosted on a domain you've added under **Authorized domains**
  on the same OAuth consent screen (e.g. `honeytrap.band`).
- It needs to actually describe *this* app's data practices — a generic
  boilerplate privacy policy copied from another site can get an app
  rejected on review.
- Because `drive.file` is a non-sensitive scope, adding these links is
  enough to publish — you don't need to go through Google's full
  verification review process.

**Two ready-to-use pages are included** — `privacy.html` and
`terms.html` — styled to match your site. To use them:

1. Open both files and check the details inside match reality (contact
   email, what data is collected, etc.) — they're already written
   specifically for this uploader, so there's nothing to fill in unless
   your setup differs from what's described.
2. Add them to your `honey-trap` repo (same place as `index.html`) and
   push — GitHub Pages will serve them at:
   - `https://honeytrap.band/privacy.html`
   - `https://honeytrap.band/terms.html`
3. In Google Cloud Console → **APIs & Services → OAuth consent screen**,
   scroll to **App information** and paste those two URLs into the
   **Privacy Policy link** and **Terms of Service link** fields. Also add
   `honeytrap.band` under **Authorized domains** if it isn't there already.
4. Save, then use the **Publish App** button to move from Testing to
   Production.

Once published, refresh tokens stop expiring after 7 days, which is what
was causing any `invalid_grant` errors you may have seen.

## A couple of things worth knowing

- **File size**: there's no hard cap coded in here. Google Drive itself
  caps individual files at 5TB, so in practice this comfortably handles
  even long, high-bitrate concert footage.
- **Storage**: uploads count against your band's own Google Drive storage
  quota (15GB free, or whatever your Google One plan provides). Worth
  keeping an eye on if you expect a lot of video.
- **Privacy**: nothing here is public — files go straight into your
  private Drive folder. No one else can see or access what's uploaded.
- **Abuse**: this page is open to anyone with the link, same as a
  Google Form would be. If you ever want to lock it down further (e.g. a
  simple passphrase, or rate-limiting), that's a small addition — just ask.

# KiwiQuote lead form → email + Google Sheet

The website form posts each lead to a small Google Apps Script Web App, which:

1. Adds a row to a Google Sheet (one column per answer), and
2. Emails the lead to a notification inbox.

It's free, needs no server, and setup is a one-time ~5 minutes.

> **Testing vs go-live:**
> While we trial the site, leads go to **info@webtag.co.nz** (the WebTag inbox), so set
> this up signed in to the **WebTag** Google account. When KiwiQuote goes live, change
> `NOTIFY_EMAIL` in `Code.gs` to `admin@kiwiquote.co.nz` and redeploy a new version
> (and, if you prefer, move the script to the KiwiQuote account). The URL and the website
> stay the same.

---

## Setup (do this once, signed in to the WebTag Google account for testing)

1. Go to **https://sheets.new** to create a new Google Sheet. Name it e.g. "KiwiQuote Leads". (Leave it empty — the script builds the header row itself.)
2. In that sheet, click **Extensions → Apps Script**. A code editor opens in a new tab.
3. Delete any sample code in `Code.gs`, then **paste the entire contents of `Code.gs`** from this folder. Click the **Save** icon.
4. Click **Deploy → New deployment**.
   - Click the gear icon next to "Select type" and choose **Web app**.
   - **Description:** anything (e.g. "Lead handler").
   - **Execute as:** *Me* (the KiwiQuote account).
   - **Who has access:** **Anyone**.  ← important, so the website can post to it.
   - Click **Deploy**.
5. Google will ask you to **authorise** the script (because it sends email and edits the sheet). Approve it. If you see "Google hasn't verified this app", click **Advanced → Go to … (unsafe)** — this is normal for your own script.
6. Copy the **Web app URL** it gives you. It looks like:
   `https://script.google.com/macros/s/AKfy....../exec`

## Connect it to the website

1. Open `index.html`.
2. Find this line (near the bottom, in the `<script>`):
   ```js
   var LEAD_ENDPOINT = "";
   ```
3. Paste the Web app URL between the quotes:
   ```js
   var LEAD_ENDPOINT = "https://script.google.com/macros/s/AKfy....../exec";
   ```
4. Save and re-publish the site. Done.

## Test it

Fill in the form on the site and press **Send my details**. Within a few seconds you should see:
- a new row in the Google Sheet, and
- an email at admin@kiwiquote.co.nz.

---

## Good to know

- **Where the data goes / "relevant category":** each answer lands in its own column —
  Timestamp, Name, Phone, Phone verified, Email, Interested in, Currently insured, Age,
  Best time to call, Notes, Source. You can sort/filter the sheet by any of these
  (e.g. filter "Interested in" = Life insurance).
- **Want a separate tab per insurance type** (Life / Medical / Income) instead of one list?
  That's a small change to `Code.gs` — say the word and it can route each lead to its own tab.
- **Changing the notification address:** edit `NOTIFY_EMAIL` at the top of `Code.gs`, then
  **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**.
  (Re-deploying a new version is needed for any code change to take effect. The URL stays the same.)
- **Daily email limit:** consumer Gmail allows ~100 MailApp emails/day, which is plenty for
  leads. Google Workspace accounts get ~1,500/day.

![A digital store with card checkout, built by Claude Code on Elements: the creator's sales dashboard with total revenue, sales, downloads and buyers, and downloads per product.](https://elements.dev/demos/01a0f422-a1d8-7d6a-a748-48aa9dcb5a42/poster?v=e2588e93de52)

# A digital store with card checkout, built by Claude Code on Elements

> Bytestall is a full-stack app built with Claude Code on Elements.

Card checkout with just an email, a five-use download link, a buyer library, and a creator dashboard with live sales.

[Run this app on your machine](https://elements.dev/demos/01a0f422-a1d8-7d6a-a748-48aa9dcb5a42). Use this demo as inspiration, or as the starting point for your own app. Your agent creates a new app with this one as the scaffold, and you prompt it to add whatever features you want.

## Payments

Without a Stripe key, payments run through the store's built-in test checkout:
the buy button opens an in-app checkout page with the order and its total, and
paying there records the sale, sends the download email and updates the
creator's dashboard like a real payment. For real Stripe Checkout, add a
Stripe secret key (a free sandbox at
[dashboard.stripe.com/register](https://dashboard.stripe.com/register)) as
`STRIPE_SECRET_KEY` in `config/env/development.env`, and test with card
4242 4242 4242 4242, any future date and any CVC. Production requires the key
and registers its own Stripe webhook on the first checkout. In development,
download emails are written to `.elements/logs/program.log` instead of being
sent.

## How it's built

Bytestall needed product uploads, guest card checkout, download links with a limit and an expiry, emails, and live sales totals. Each of those is a part of Elements, so the agent spent its 22 minutes on the store itself.

- **Card checkout with just an email.** The buy button prices the product on the server and sends the buyer to Stripe Checkout. The order is recorded when the buyer returns and again when Stripe's webhook arrives, once either way. Without a Stripe key the button opens a test checkout inside the app, which records the sale through the same function, so the whole flow runs before Stripe is connected. In production the app registers its own webhook on the first checkout.

- **Product uploads.** The creator's product form sends the cover and the PDF or ZIP as file fields to an `@rpc` function, which checks each file's own bytes for its type and stores both.

- **Download links that count.** Each purchase gets a link that works five times and expires in thirty days. One SQL update checks the count and the expiry and spends a download, so every click is counted exactly once.

- **Live sales totals.** Each payment, download and resend notifies a channel, and the creator's dashboard re-reads its totals, so revenue and download counts move while it is open.

- **Download emails.** A template emails the download link along with a link to the buyer's library of everything bought with that email, and the creator can resend it with a fresh link.

- **Data from SQL files.** Migrations define the store and seed the creator, six products with drawn covers and real PDF and ZIP files, and a dozen past sales. The project server applied each one as soon as it was saved.

## Why Elements

Elements is an integrated full-stack app framework and a project server. The project server checks the agent's work as it builds: it type-checks the server and browser code, analyzes the program, applies migrations and runs the tests, then reports the results to the agent. A security mistake, such as calling a server-only function from the browser, is a compile error. The agent reads the report and fixes its own mistakes before it tells you a feature is done. The same checks run on every feature you ask for next.

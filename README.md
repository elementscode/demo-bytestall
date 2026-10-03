![Bytestall, a digital product store built with Elements: the creator's sales dashboard with total revenue, sales, downloads and buyers, and downloads per product.](https://elements.dev/demos/01a0f422-a1d8-7d6a-a748-48aa9dcb5a42/poster?v=e2588e93de52)

# Bytestall

> A demo app built with [Elements](https://elements.dev).

Card checkout with just an email, a five-use download link, a buyer library, and a creator dashboard with live sales.

**Demo:** [Bytestall](https://elements.dev/demos/01a0f422-a1d8-7d6a-a748-48aa9dcb5a42)

## Agent specs

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 22 min
- **Cost:** $6.93 at API rates, September 2026

## Get started

```bash
elements create bytestall -scaffold=elementscode/demo-bytestall
```

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

### What Elements gave the app

- **Card checkout with just an email.** The buy button prices the product on the server and sends the buyer to Stripe Checkout. The order is recorded when the buyer returns and again when Stripe's webhook arrives, once either way. Without a Stripe key the button opens a test checkout inside the app, which records the sale through the same function, so the whole flow runs before Stripe is connected. In production the app registers its own webhook on the first checkout.

- **Product uploads.** The creator's product form sends the cover and the PDF or ZIP as file fields to an `@rpc` function, which checks each file's own bytes for its type and stores both.

- **Download links that count.** Each purchase gets a link that works five times and expires in thirty days. One SQL update checks the count and the expiry and spends a download, so every click is counted exactly once.

- **Live sales totals.** Each payment, download and resend notifies a channel, and the creator's dashboard re-reads its totals, so revenue and download counts move while it is open.

- **Download emails.** A template emails the download link along with a link to the buyer's library of everything bought with that email, and the creator can resend it with a fresh link.

- **Data from SQL files.** Migrations define the store and seed the creator, six products with drawn covers and real PDF and ZIP files, and a dozen past sales. The project server applied each one as soon as it was saved.

### What the project server gave the agent

The project server runs alongside the agent and answers as soon as a file is saved: it type-checks the templates, TypeScript and SQL, applies migrations and reruns the tests, so every question came back right away and the agent kept building.

### What shipped

The app type-checks with zero errors and all 21 tests pass. Every page works on desktop and phone. A real sandbox payment goes through Stripe end to end and its download link serves the file, and live updates arrive on the creator's dashboard, such as the download count rising as a buyer downloads.

## Seed data and demo account

The seed creates Juno Park Studio's store: six products (four with PDF files,
two with ZIPs), each with a cover the app draws as SVG, and a dozen past sales
to eight buyers with some downloads already used.

| Email                 | Password    | Role    |
| --------------------- | ----------- | ------- |
| creator@bytestall.dev | `bytestall` | creator |

The sign-in page shows the login. Buyers have no accounts: each buyer's
download page and library are reached from the links in their emails.

**Demo:** [Bytestall](https://elements.dev/demos/01a0f422-a1d8-7d6a-a748-48aa9dcb5a42)

## License

MIT. See [LICENSE](LICENSE).

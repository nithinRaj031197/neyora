# Orders

Customers pick a pack and a quantity and place an order. We phone them to
confirm. No payment is taken on the site — a gateway comes later.

## Setup

Orders need MongoDB. Everything else on the site works without it.

Add to `.env.local` (gitignored — never commit it):

```
MONGODB_URI="mongodb+srv://USER:PASSWORD@cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=neyora"
MONGODB_DB="neyora"
```

Atlas: free M0 tier, AWS, **Mumbai (ap-south-1)** — the customers are in India
and a database in Virginia adds a quarter-second to every order. Network Access
must list the IP that connects.

**If the password leaks, rotate it** in Atlas → Database Access → Edit user →
Edit Password. Only the line above changes; no code does.

## Shape

The collection has no schema of its own — MongoDB stores whatever it is given —
so `lib/orders/schema.ts` is the only thing preventing a bad row. Every write
goes through it.

| Field | Notes |
| --- | --- |
| `reference` | `NEY-0001`. Unique. What you read out on the phone. |
| `status` | `new → called → confirmed → delivered`, or `cancelled` |
| `customer` | name, phone, area, optional note |
| `items` | product slug, name, pack label, unit price, quantity |
| `total` | **Computed server-side.** Never posted by the form. |
| `history` | every status change, with its timestamp |

Phone numbers are stored as ten digits. `+91 98765 43210`, `098765-43210` and
`(+91) 9876543210` all become `9876543210`, so a returning customer is one
customer rather than three.

## Rules worth knowing

- **The total is never trusted from the request.** It is recomputed from
  `items` on the server, or the customer picks their own price.
- **Status changes are conditional writes.** `advanceOrder` matches on the
  current status, so two admins clicking at once cannot both succeed — the
  second gets `null` instead of silently overwriting the first.
- **Nothing connects at import time.** `lib/db/mongo.ts` dials Atlas on first
  query, so `next build` still prerenders the static pages on a machine with no
  database configured.
- **One client per process**, parked on `globalThis` so dev hot-reloads do not
  leak pooled connections.

## Indexes

Created idempotently on first write, not by a migration step:
`reference` (unique), `createdAt`, `status + createdAt`,
`customer.phone + createdAt`.

## Deployment

The `mongodb` driver needs TCP and **will not run on Cloudflare Workers**,
which is what `npm run cf:deploy` targets. Atlas's HTTP Data API — the usual
way round this — was retired in September 2025. Local development is
unaffected. Resolve before launch: either host on a Node runtime (Vercel,
Railway, Fly) or move orders to a store Workers can reach.


# 🍕 PizzaHub — Server

REST API for the PizzaHub pizza ordering and delivery platform, built with **Express** and **MongoDB**. It handles menu items, orders, role-based access, Stripe payments and admin moderation.

## 🔗 Links

| | Link |
|---|---|
| Live API | https://pizzahub-server-snowy.vercel.app |
| Live site | https://pizzahub-client-gules.vercel.app |
| Server repo | https://github.com/Mita-div1/pizzahub-server |
| Client repo | https://github.com/Mita-div1/pizzahub-client |

## ✨ Features

- JWT verification (via Better Auth JWKS) and role-based middleware
- Public menu API with search, filter, sort and limit
- Vendor menu CRUD with ownership checks
- Customer orders with duplicate prevention and cancel-while-pending
- Vendor order management (accept / reject)
- Admin: stats, user management (block / unblock), menu approval, read-only transactions
- Stripe Checkout for Premium vendor subscription
- Stripe webhook activates Premium (30 days) only after confirmed payment, idempotent per session

## 🛠 Tech Stack

- **Node.js**, **Express v5**
- **MongoDB** (official driver, Atlas)
- **jose** (JWT / JWKS verification)
- **Stripe**
- **cors**, **dotenv**
- Deployed on **Vercel** (serverless)

## 📦 Installation

```bash
git clone https://github.com/Mita-div1/pizzahub-server.git
cd pizzahub-server
npm install
```

## ⚙️ Environment Variables

Create a `.env` file. Only names are listed:


MONGODB_URI=
JWT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
CLIENT_URL=
PORT=


`CLIENT_URL` is used to fetch the JWKS from `${CLIENT_URL}/api/auth/jwks`.

## ▶️ Run Locally

```bash
node index.js
```

The API runs on http://localhost:5000. For webhooks locally:

```bash
stripe listen --forward-to localhost:5000/webhook
```

## 📚 API Overview

| Area | Endpoints | Access |
|---|---|---|
| Menu | `GET /menu-items`, `GET /menu-items/:id` | Public |
| Vendor menu | `/vendor/menu-items` (GET, POST, PATCH, DELETE) | Vendor |
| Customer orders | `/customer/orders` (POST, GET, cancel) | Customer |
| Vendor orders | `/vendor/orders` (GET, status update) | Vendor |
| Admin | `/admin/stats`, `/admin/users`, `/admin/menu-items`, `/admin/transactions` | Admin |
| Payments | `POST /payments/create-checkout-session` | Vendor |
| Webhook | `POST /webhook` | Stripe only |

## 🧪 Challenge Implementation

**1. Search, filter & sort** — `GET /menu-items` only returns approved items and accepts:

| Param | Example |
|---|---|
| `search` | `?search=pepperoni` |
| `category` | `?category=Non-Veg` |
| `location` | `?location=Dhaka` |
| `sort` | `?sort=price_asc` or `price_desc` |
| `limit` | `?limit=6` |

**2. JWT middleware flow**
1. Client sends `Authorization: Bearer <token>`.
2. `verifyToken` verifies the token with jose against the client's JWKS and attaches `id`, `email`, `role` to the request.
3. `verifyRole("vendor" | "customer" | "admin")` allows or blocks the route.
4. Route handlers check ownership (e.g. a vendor can only touch their own items and orders).

**3. Stripe webhook**
`/webhook` uses `express.raw` and is mounted **before** `express.json()` so the signature can be verified. Premium is activated only on `checkout.session.completed` with `payment_status = paid`.

## 🔑 Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@pizzahub.com | Admin123 |
| Vendor | vendor@pizzahub.com | Vendor123 |

Stripe test card: `4242 4242 4242 4242`, any future date, CVC `123`.

## 👩‍💻 Author

Moumita Bala
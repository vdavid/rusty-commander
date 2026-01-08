# License server

Cloudflare Worker that handles Paddle webhooks and generates Ed25519-signed license keys for Cmdr.

## Overview

This server receives purchase notifications from Paddle, generates cryptographically signed license keys, and emails
them to customers via Resend.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Purchase flow                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. User clicks "Buy" on getcmdr.com                                │
│           ↓                                                          │
│  2. Redirect to Paddle checkout (paddle.com/checkout/...)           │
│           ↓                                                          │
│  3. User pays → Paddle sends webhook to this server                 │
│           ↓                                                          │
│  4. Server generates Ed25519-signed license key                     │
│           ↓                                                          │
│  5. Server emails license key to user via Resend                    │
│           ↓                                                          │
│  6. User enters key in Cmdr app                                     │
│           ↓                                                          │
│  7. App validates signature locally (no server call needed)         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Generate Ed25519 key pair

```bash
pnpm run generate-keys
```

This creates:

- `keys/private.key` — Keep secret, set as Cloudflare secret
- `keys/public.key` — Embed in Tauri app

**Important:** Never commit the private key. The `keys/` folder is in `.gitignore`.

### 3. Copy public key to Tauri app

Edit `apps/desktop/src-tauri/src/licensing/verification.rs` line 12:

```rust
const PUBLIC_KEY_HEX: &str = "your-64-character-public-key-here";
```

### 4. Set Cloudflare secrets

```bash
# Login to Cloudflare (first time only)
npx wrangler login

# Set secrets
npx wrangler secret put PADDLE_WEBHOOK_SECRET   # From Paddle dashboard
npx wrangler secret put ED25519_PRIVATE_KEY     # From keys/private.key
npx wrangler secret put RESEND_API_KEY          # From resend.com
```

### 5. Deploy

```bash
pnpm run deploy
```

Your server will be at: `https://cmdr-license-server.<your-subdomain>.workers.dev`

## Local development

Create `.dev.vars` with your secrets:

```
PADDLE_WEBHOOK_SECRET=your_paddle_secret
ED25519_PRIVATE_KEY=your_private_key_hex
RESEND_API_KEY=re_xxxxx
```

Then run:

```bash
pnpm run dev
```

## Endpoints

| Method | Path              | Description                                      |
| ------ | ----------------- | ------------------------------------------------ |
| `GET`  | `/`               | Health check                                     |
| `POST` | `/webhook/paddle` | Paddle webhook (generates and emails license)    |
| `POST` | `/admin/generate` | Manual license generation (requires auth header) |

## Paddle configuration

1. Create a product ($29 one-time purchase)
2. Go to Developer Tools → Notifications
3. Add webhook URL: `https://cmdr-license-server.<subdomain>.workers.dev/webhook/paddle`
4. Select event: `transaction.completed`
5. Copy the webhook secret to Cloudflare

## Resend configuration

1. Sign up at [resend.com](https://resend.com) (free tier: 100 emails/day)
2. Add and verify your domain (`getcmdr.com`)
3. Create an API key
4. Set as Cloudflare secret

## Architecture decisions

- See [ADR 014: Payment provider choice](../docs/adr/014-payment-provider-paddle.md) for why Paddle
- See [ADR 015: License model](../docs/adr/015-license-model-agpl-trial.md) for the AGPL + trial approach
- See [Licensing feature docs](../docs/features/licensing.md) for the full feature overview

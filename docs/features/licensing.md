# Licensing

This document describes Cmdr's licensing and payment system.

## Overview

Cmdr uses a **7-day trial with one-time purchase** model:

1. Users download and try Cmdr for free for 14 days
2. After the trial, a $29 one-time license is required
3. Licenses are validated locally using Ed25519 cryptographic signatures

The source code is open under AGPL-3.0. Users can compile it themselves and use it without restriction — we sell the convenience of signed, auto-updating binaries.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Components                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐     ┌─────────────────┐     ┌───────────────┐  │
│  │  getcmdr.com    │────▶│  Paddle         │────▶│ License       │  │
│  │  (website)      │     │  (payment)      │     │ server        │  │
│  └─────────────────┘     └─────────────────┘     └───────┬───────┘  │
│                                                          │          │
│                                                          ▼          │
│                                                   ┌───────────────┐  │
│                                                   │ Email         │  │
│                                                   │ (Resend)      │  │
│                                                   └───────┬───────┘  │
│                                                          │          │
│                                                          ▼          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Cmdr app                                                    │   │
│  │  - Trial tracking (14 days)                                  │   │
│  │  - License key input                                         │   │
│  │  - Ed25519 signature validation (offline)                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Related documentation

- [ADR 014: Payment provider choice](../adr/014-payment-provider-paddle.md) — Why we chose Paddle
- [ADR 015: License model](../adr/015-license-model-agpl-trial.md) — Why AGPL + trial
- [License server README](../../apps/license-server/README.md) — Setup and deployment

## User flow

### Trial period

1. User downloads Cmdr from getcmdr.com
2. On first launch, app records the timestamp
3. App shows remaining trial days in the UI
4. Full functionality is available during trial

### Purchase

1. User clicks "Buy license" (in app or on website)
2. Redirects to Paddle checkout
3. User pays $29
4. Paddle sends webhook to license server
5. License server generates Ed25519-signed key
6. User receives license key via email

### Activation

1. User opens Cmdr → Menu → Enter license key
2. User pastes license key
3. App validates Ed25519 signature locally (no network needed)
4. App stores license in macOS Keychain
5. App shows "Licensed" status

### Validation

The license key format is: `base64(payload).base64(signature)`

Payload contains:
```json
{
  "email": "user@example.com",
  "transactionId": "txn_xxx",
  "issuedAt": "2026-01-08T12:00:00Z"
}
```

The app embeds the Ed25519 public key at compile time. Validation is purely local — no server call needed.

## Implementation

### Tauri app (`apps/desktop/src-tauri/src/licensing/`)

| File | Purpose |
|------|---------|
| `mod.rs` | Module entry, shared types |
| `trial.rs` | 7-day trial tracking using tauri-plugin-store |
| `verification.rs` | Ed25519 signature validation |

### Tauri commands

| Command | Description |
|---------|-------------|
| `get_license_status` | Returns `Licensed`, `Trial`, or `TrialExpired` |
| `activate_license` | Validates and stores a license key |
| `get_license_info` | Returns stored license info |
| `reset_trial` | Debug only — resets trial for testing |

### License server (`apps/license-server/`)

Cloudflare Worker that:
1. Receives Paddle webhooks
2. Generates Ed25519-signed license keys
3. Sends license emails via Resend

See [license server README](../../apps/license-server/README.md) for full documentation.

## Security considerations

- **Private key protection**: Ed25519 private key is stored as Cloudflare secret, never in code
- **Public key embedding**: Public key is embedded in compiled binary
- **Offline validation**: No server dependency for validation — works without internet
- **Webhook verification**: Paddle webhook signatures are verified to prevent forgery
- **Local storage**: License keys stored in tauri-plugin-store (SQLite-backed)

## Pricing

| Tier | Price | Includes |
|------|-------|----------|
| Trial | Free | 14 days full access |
| License | $29 one-time | Lifetime updates, 2 machines |

## What paying users get

Compared to self-compiling:

- ✅ Signed and notarized macOS binary (no Gatekeeper warnings)
- ✅ Automatic updates
- ✅ Priority support
- ✅ Supporting indie development

# Deploy webhook

Webhook listener for GitHub Actions to trigger deployments without requiring SSH access.

## How it works

1. GitHub Actions workflow completes successfully
2. Workflow sends a signed POST request to `https://getcmdr.com/hooks/deploy-website`
3. Caddy forwards the request to the local webhook listener
4. Webhook verifies the HMAC-SHA256 signature
5. If valid, runs `deploy-website.sh`

## Files

- `hooks.json` — Webhook configuration (reads secret from env var)
- `deploy-website.sh` — The actual deployment script

## Security

The webhook uses HMAC-SHA256 signature verification. Only requests signed with the correct
secret are accepted. The secret is stored in:

- GitHub: Repository secret `DEPLOY_WEBHOOK_SECRET`
- Server: Environment variable loaded by systemd

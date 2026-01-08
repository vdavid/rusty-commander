# Deploying the website

The website (getcmdr.com) is automatically deployed when changes are pushed to the `main` branch and all CI
checks pass.

## How it works

1. Push to `main` (or merge a PR)
2. GitHub Actions runs the `website` job (Prettier, ESLint, typecheck, build, Playwright, Lighthouse)
3. If all checks pass, the `deploy-website` job runs
4. The deploy job SSHs into the server and:
   - Pulls the latest code
   - Rebuilds the Docker image
   - Restarts the container

## Server setup (one-time)

### 1. Create the deploy user

```bash
# Create the deploy-cmdr user (no password, no sudo)
sudo adduser --disabled-password --gecos "" deploy-cmdr

# Add to docker group
sudo usermod -aG docker deploy-cmdr

# Create the directory
sudo mkdir -p /opt/cmdr
sudo chown deploy-cmdr:deploy-cmdr /opt/cmdr
```

### 2. Clone the repository

```bash
sudo -u deploy-cmdr git clone https://github.com/vdavid/cmdr.git /opt/cmdr
```

### 3. Generate an SSH key for GitHub Actions

```bash
# Switch to deploy-cmdr user
sudo -u deploy-cmdr -i

# Generate key
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy -N ""

# Authorize the key
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Display the private key (copy this to GitHub)
cat ~/.ssh/github_deploy
```

### 4. Add secrets to GitHub

Go to the repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

| Name             | Value                                                   |
| ---------------- | ------------------------------------------------------- |
| `SERVER_HOST`    | `37.27.245.171` (or `getcmdr.com`)                      |
| `SERVER_USER`    | `deploy-cmdr`                                           |
| `SERVER_SSH_KEY` | The private key from step 3 (including BEGIN/END lines) |

### 5. Set up Docker network and do the initial deploy

```bash
# As deploy-cmdr user
sudo -u deploy-cmdr -i
cd /opt/cmdr/apps/website

# Create the network if it doesn't exist
docker network create proxy-net 2>/dev/null || true

# Build and start the container
docker compose up -d --build
```

### 6. Configure Caddy

Add this to your Caddyfile:

```
getcmdr.com {
    reverse_proxy getcmdr-static:80
}

www.getcmdr.com {
    redir https://getcmdr.com{uri} permanent
}
```

Then reload Caddy:

```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## Troubleshooting

### Check deployment logs

In GitHub Actions, look at the `Deploy website` job output.

### Check container status on server

```bash
sudo -u deploy-cmdr docker ps
sudo -u deploy-cmdr docker logs getcmdr-static
```

### Manual deploy

If you need to deploy manually:

```bash
sudo -u deploy-cmdr -i
cd /opt/cmdr
git pull origin main
cd apps/website
docker compose down
docker compose build --no-cache
docker compose up -d
```

### SSH connection issues

Test the connection locally:

```bash
ssh -i /path/to/private/key deploy-cmdr@37.27.245.171
```

If it fails, check:

- Firewall allows port 22
- SSH key permissions (`chmod 600`)
- User is in the `authorized_keys` file

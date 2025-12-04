# Deployment Guide

Guide for deploying the Color Name API to production environments.

## Fly.io Deployment

The Color Name API is deployed on [Fly.io](https://fly.io). The live API is available at:
- **API URL:** `https://color-name-api.fly.dev`

### Prerequisites

1. Install the Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Authenticate: `fly auth login`

### Initial Deployment

```bash
# Launch the app (first time only)
fly launch

# Deploy
fly deploy
```

### Environment Variables on Fly.io

Set secrets using the Fly CLI:

```bash
# Database
fly secrets set SUPABASE_URL=https://your-project.supabase.co
fly secrets set SUPABASE_KEY=your-anon-key

# Socket.IO
fly secrets set SOCKET=true
fly secrets set ALLOWED_SOCKET_ORIGINS=https://color.pizza,https://yourdomain.com

# Contact
fly secrets set SECURITY_CONTACT=security@yourdomain.com
fly secrets set CONTACT_EMAIL=api@yourdomain.com
```

View current secrets:
```bash
fly secrets list
```

Remove secrets:
```bash
fly secrets unset SECRET_NAME
```

### Scaling

```bash
# Scale to multiple instances
fly scale count 2

# Scale machine size
fly scale vm shared-cpu-1x
```

### Monitoring

```bash
# View logs
fly logs

# Check status
fly status

# Open dashboard
fly dashboard
```

---

## Docker Deployment

A Dockerfile is included for containerized deployments.

### Build and Run

```bash
# Build
docker build -t color-name-api .

# Run
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_KEY=your-key \
  -e SOCKET=true \
  -e ALLOWED_SOCKET_ORIGINS=https://yourdomain.com \
  color-name-api
```

### Docker Compose

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      NODE_ENV: production
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_KEY: ${SUPABASE_KEY}
      SOCKET: "true"
      ALLOWED_SOCKET_ORIGINS: https://yourdomain.com
    restart: unless-stopped
```

---

## Manual/VPS Deployment

### Requirements

- Node.js >= 20.11.0 or Bun >= 1.0
- npm >= 10.2.0 (if using Node.js)

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/meodai/color-name-api.git
   cd color-name-api
   ```

2. Install dependencies:
   ```bash
   bun install
   # or
   npm install
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env with your production values
   ```

4. Start the server:
   ```bash
   # With Bun (recommended)
   bun run start:bun

   # With Node.js
   npm run start
   ```

### Process Manager (PM2)

For production, use a process manager:

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start "bun run start:bun" --name color-api

# Or with ecosystem file
pm2 start ecosystem.config.js
```

Example `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'color-api',
    script: 'bun',
    args: 'run start:bun',
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    }
  }]
};
```

---

## Reverse Proxy (Nginx)

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

For SSL, use Let's Encrypt with Certbot:
```bash
certbot --nginx -d api.yourdomain.com
```

---

## Health Checks

The API provides health check endpoints:

- `GET /v1/` - Returns API info (useful for liveness check)
- `GET /.well-known/security.txt` - Security contact info

Example health check:
```bash
curl -f https://your-api.com/v1/ || exit 1
```

---

## Troubleshooting

### Common Issues

**1. Database connection failed**
- Check `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Verify network access to Supabase

**2. Socket.IO not working**
- Ensure `SOCKET=true` is set
- Check `ALLOWED_SOCKET_ORIGINS` includes your frontend domain
- Verify WebSocket connections aren't blocked by firewall

**3. Rate limiting too aggressive**
- Increase `RATE_LIMIT_MAX_REQUESTS`
- Consider disabling with `RATE_LIMIT_ENABLED=false` for internal use

### Logs

Check application logs for errors:
```bash
# Fly.io
fly logs

# PM2
pm2 logs color-api

# Docker
docker logs container-name
```

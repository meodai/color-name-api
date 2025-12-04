# Configuration Reference

Complete reference for all environment variables supported by the Color Name API.

## Quick Start

1. Copy `.env.example` to `.env`
2. Customize values for your environment
3. Start the server with `bun run dev` or `bun run start:bun`

---

## Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode (`development`, `production`) |
| `PORT` | `8080` | Server port |

---

## Database (Supabase)

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | - | Your Supabase project URL |
| `SUPABASE_KEY` | - | Your Supabase anon/public key |
| `NODB` | `false` | Set to `true` to disable database (API works without persistence) |

**Example:**
```bash
SUPABASE_URL=https://abcd1234.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Socket.IO (WebSockets)

| Variable | Default | Description |
|----------|---------|-------------|
| `SOCKET` | `false` | Enable Socket.IO for real-time updates |
| `ALLOWED_SOCKET_ORIGINS` | localhost + color.pizza | Comma-separated list of allowed origins |
| `SOCKET_BROADCAST_LIMIT` | `50` | Max colors per broadcast event |

**Example:**
```bash
SOCKET=true
ALLOWED_SOCKET_ORIGINS=https://color.pizza,https://yourdomain.com,https://*.vercel.app
SOCKET_BROADCAST_LIMIT=50
```

**Wildcard Support:**
- `*` - Allow all origins (not recommended for production)
- `https://*.vercel.app` - Allow all Vercel preview deployments

**Security Warning:** In production, always set `ALLOWED_SOCKET_ORIGINS` explicitly. The default includes localhost URLs which should not be allowed in production.

---

## Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_ENABLED` | `true` | Enable/disable rate limiting |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Window duration in milliseconds (1 minute) |

**Tier System:**
The API supports different rate limit tiers based on API keys:

- `anonymous`: 60 requests/minute
- `free`: 100 requests/minute
- `pro`: 1000 requests/minute
- `enterprise`: 10000 requests/minute

---

## API Limits

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_COLORS_PER_REQUEST` | `170` | Maximum colors in a single API request |
| `DEFAULT_SEARCH_RESULTS` | `20` | Default number of results for name search |
| `MAX_SEARCH_RESULTS` | `50` | Maximum allowed results for name search |

---

## Cache Configuration

Adjust these based on your memory constraints and traffic patterns.

| Variable | Default | Description |
|----------|---------|-------------|
| `CACHE_GZIP_SIZE` | `500` | Compressed response cache size |
| `CACHE_FULLLIST_SIZE` | `50` | Full color list cache size |
| `CACHE_COLORNAME_SIZE` | `1000` | Individual color name cache size |
| `CACHE_RATELIMIT_SIZE` | `10000` | Rate limit tracking cache size |
| `CACHE_CLOSEST_SIZE` | `5000` | Closest color match cache size |

**Memory Considerations:**
- Higher values = more memory, better hit rates
- Lower values = less memory, more recomputation
- Default values are suitable for most deployments

---

## CORS Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_MAX_AGE` | `86400` | Preflight cache duration in seconds (24 hours) |

---

## Contact Information

Used in `/.well-known/security.txt`:

| Variable | Default | Description |
|----------|---------|-------------|
| `SECURITY_CONTACT` | `color-name-api@elastiq.click` | Security contact email |
| `CONTACT_EMAIL` | `color-name-api@elastiq.click` | General contact email |

---

## Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Configure `SUPABASE_URL` and `SUPABASE_KEY`
- [ ] Set `ALLOWED_SOCKET_ORIGINS` (remove localhost URLs)
- [ ] Set `SECURITY_CONTACT` and `CONTACT_EMAIL`
- [ ] Review rate limits for your expected traffic
- [ ] Adjust cache sizes if needed

---

## Example .env Files

### Development
```bash
NODE_ENV=development
PORT=8080
NODB=true
SOCKET=true
```

### Production
```bash
NODE_ENV=production
PORT=8080
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SOCKET=true
ALLOWED_SOCKET_ORIGINS=https://color.pizza,https://yourdomain.com
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=1000
SECURITY_CONTACT=security@yourdomain.com
CONTACT_EMAIL=api@yourdomain.com
```

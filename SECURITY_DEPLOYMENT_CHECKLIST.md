# Production security checklist

Complete every item before exposing the portal to the internet.

## Secrets and access

- [ ] Rotate the database password, `AUTH_SECRET`/`NEXTAUTH_SECRET`, Google OAuth secret, SMTP credentials, Cloudflare tunnel token, and `INBOUND_EMAIL_SECRET` that were previously stored in `.env.docker`.
- [ ] Store all production secrets in the deployment platform's secret manager or an untracked `.env.local`; never commit them.
- [ ] Set `AUTH_SECRET` (or `NEXTAUTH_SECRET`) to a unique random value of at least 32 characters. Generate one with `openssl rand -base64 32`.
- [ ] Set a long, random `INBOUND_EMAIL_SECRET` before enabling inbound email sync.
- [ ] Require multi-factor authentication for every corporate Google account allowed to sign in. Prefer corporate SSO over password-only accounts.
- [ ] Review Full Access users and remove accounts that no longer need administrative access.

## Network and deployment

- [ ] Set `NEXTAUTH_URL` and `AUTH_URL` to the public `https://` portal URL.
- [ ] Expose the app through Cloudflare Tunnel or a TLS reverse proxy; do not open port 3003 to the internet.
- [ ] Enable Cloudflare WAF/rate-limit rules for `/api/auth/*` and the login page.
- [ ] Keep the PostgreSQL service private to the Docker network; do not publish port 5432.
- [ ] Restrict Cloudflare Tunnel access with Cloudflare Access if the portal is internal-only.

## Operations

- [ ] Commit the current security changes, including removal of `.env.docker` from Git tracking.
- [ ] Keep the host OS, Docker, Node image, and npm dependencies patched. Run `npm audit --omit=dev` before releases.
- [ ] Back up the PostgreSQL volume and `/app/data` regularly; encrypt backups and test restores.
- [ ] Centralize logs and alert on repeated failed sign-ins, unexpected admin changes, and inbound-email authentication failures.
- [ ] Review this checklist after every major deployment or access-control change.

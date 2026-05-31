# CloudTAK Locator Plugin

CloudTAK menu plugin for **cellphone ping / RTT / email parse** and **TAK Portal SMS locator** management.

Cellphone plotting code is **vendored in this repository** (`lib/cellphone/`, `components/cellphone/PingForm.vue`). You do not need [cloudtak-plugin-cellphone](https://github.com/clptak/cloudtak-plugin-cellphone) installed separately.

## Tabs

| Tab | Description |
|-----|-------------|
| **Cellphone Data** | Cell ping, RTT timing advance, and carrier email parse |
| **SMS Locator** | Create/list/archive locators via TAK Portal; send share links via TAK Portal SMS |
| **Settings** | TAK Portal base URL and connection test |

## Prerequisites

1. **TAK Portal** with the locate feature, SMS configured under **Server Settings → SMS** (Twilio or Brevo), and your user granted `page.locate`. CloudTAK and TAK Portal must share SSO so the browser can call TAK Portal APIs with `credentials: 'include'`. If they are on different subdomains (e.g. `cloudtak.*` and `takportal.*`), add CORS headers on TAK Portal for `/api/locate/*` — see [TAK Portal CORS (cross-subdomain, Caddy + Authentik)](#tak-portal-cors-cross-subdomain-caddy--authentik).

2. **TAK Portal Server Settings** — TAK URL/certs for relaying GPS pings to TAK Server, plus SMS provider credentials. The plugin does **not** store Twilio settings; it calls TAK Portal `POST /api/locate/locators/:id/send-link-sms`, which uses portal SMS configuration to build and send the link.

3. **CloudTAK HTTP proxy** is **not** required for locator SMS (only needed if you add other outbound integrations).

## Install

Only this plugin is required under `plugins/`:

```bash
git clone https://github.com/clptak/cloudtak-plugin-locator.git
ln -sf "$(pwd)/cloudtak-plugin-locator" ~/CloudTAK/api/web/plugins/locator
cd ~/CloudTAK/api/web && npm run serve
```

Open CloudTAK, load the map, and select **Locator** in the main menu.

If you previously installed `plugins/ping` (cloudtak-plugin-cellphone), you can remove that symlink — this plugin replaces it for the Cellphone Data tab.

## TAK Portal CORS (cross-subdomain, Caddy + Authentik)

The **SMS Locator** tab calls TAK Portal directly from the browser with `credentials: 'include'`:

```js
fetch('https://takportal.example.com/api/locate/locators', { credentials: 'include' })
```

When CloudTAK and TAK Portal are on **different hosts** (e.g. `https://cloudtak.example.com` → `https://takportal.example.com`), the browser treats this as cross-origin and requires CORS. With Authentik `forward_auth` in front of TAK Portal, two things must be true:

1. The **`OPTIONS` preflight** for `/api/locate/*` must be answered **before** `forward_auth` — otherwise Authentik returns a `302` redirect to its login page and the preflight fails (no `Access-Control-*` headers). A failed preflight means the browser never sends the real request.
2. The **actual responses** (`GET`/`POST`/`PATCH`/`DELETE`) need `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials: true` after auth succeeds.

> You cannot use `Access-Control-Allow-Origin: *` together with credentials. Echo a specific origin instead.

### Caddyfile

Add the CORS handling **inside** your existing TAK Portal site block. Replace `cloudtak.{$PRIMARY_DOMAIN}` with your CloudTAK origin (and `tak-portal:3000` / `authentik-server-1:9000` with your upstreams):

```caddyfile
# TAK Portal
takportal.{$PRIMARY_DOMAIN} {
	route {
		reverse_proxy /outpost.goauthentik.io/* authentik-server-1:9000

		# 1. CORS preflight for the Locator plugin — MUST be before forward_auth
		@cors_preflight {
			path /api/locate/*
			method OPTIONS
		}
		handle @cors_preflight {
			header Access-Control-Allow-Origin "https://cloudtak.{$PRIMARY_DOMAIN}"
			header Access-Control-Allow-Credentials "true"
			header Access-Control-Allow-Methods "GET, POST, PATCH, DELETE, OPTIONS"
			header Access-Control-Allow-Headers "Accept, Content-Type, Authorization"
			header Access-Control-Max-Age "7200"
			header Vary "Origin"
			respond 204
		}

		# Public paths that do NOT require authentication
		@public {
			path /request-access* /lookup* /locate/* /styles.css /favicon.ico /branding/* /public/*
		}
		handle @public {
			reverse_proxy tak-portal:3000
		}

		# Authentik forward auth
		forward_auth authentik-server-1:9000 {
			uri /outpost.goauthentik.io/auth/caddy
			copy_headers X-Authentik-Username X-Authentik-Groups X-Authentik-Entitlements X-Authentik-Email X-Authentik-Name X-Authentik-Uid X-Authentik-Jwt X-Authentik-Meta-Jwks X-Authentik-Meta-Outpost X-Authentik-Meta-Provider X-Authentik-Meta-App X-Authentik-Meta-Version
			trusted_proxies private_ranges
		}

		# 2. Authenticated locate API — add CORS headers on the real responses
		handle /api/locate/* {
			reverse_proxy tak-portal:3000 {
				header_down Access-Control-Allow-Origin "https://cloudtak.{$PRIMARY_DOMAIN}"
				header_down Access-Control-Allow-Credentials "true"
				header_down Vary "Origin"
			}
		}

		# All other authenticated traffic
		reverse_proxy tak-portal:3000
	}
}
```

Reload Caddy after editing:

```bash
caddy reload --config /path/to/Caddyfile
# or, e.g.: docker compose restart caddy
```

### Verify

Preflight should return `204` with CORS headers (not a `302` to Authentik):

```bash
curl -i -X OPTIONS 'https://takportal.example.com/api/locate/locators' \
  -H 'Origin: https://cloudtak.example.com' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: accept, content-type'
```

Expect:

```
HTTP/2 204
access-control-allow-origin: https://cloudtak.example.com
access-control-allow-credentials: true
access-control-allow-methods: GET, POST, PATCH, DELETE, OPTIONS
```

If you instead see `HTTP/2 302` with a `location:` pointing at `.../application/o/authorize/...`, the `@cors_preflight` block is still **after** `forward_auth` — move it above.

### Session & permissions (separate from CORS)

CORS only lets the browser *make* the request; the API still needs a valid TAK Portal session:

- Sign into `https://takportal.example.com` in the **same browser** so it holds an Authentik session cookie for that host.
- The account needs the **`page.locate`** permission. Confirm `https://takportal.example.com/locate` loads. If CORS is correct but you get `401`/`403`, fix Authentik permissions, not CORS.
- Because cookies are scoped per host, CloudTAK and TAK Portal should share a registrable domain (e.g. both under `*.example.com`).

> **Local dev:** running CloudTAK at `http://localhost:8080` is a *different* origin than `https://cloudtak.example.com`, so it won't be covered by the single-origin header above. Test against your deployed CloudTAK host first, or extend the Caddy config to allow-list multiple origins (echo `{http.request.header.Origin}` only when it matches your allowlist).

## How locator SMS works

1. Plugin creates a locator via `POST /api/locate/locators` (TAK Portal generates the slug).
2. Plugin sends SMS via `POST /api/locate/locators/:id/send-link-sms` with `{ phones: "..." }`.
3. TAK Portal builds the public URL (`https://{portal}/locate/{slug}`) and sends it using configured Twilio/Brevo credentials.
4. Recipient opens the link; TAK Portal handles GPS pings and TAK Server relay.

## Development

```bash
cd cloudtak-plugin-locator
npm install
npm run typecheck
```

## Architecture

- **Cellphone ping / RTT / email** → client-side GeoJSON → CloudTAK map worker (`lib/cellphone/`).
- **Locator CRUD / history / manual ping / SMS send** → TAK Portal `/api/locate/*` (session cookies).
- **Public share page & GPS relay** → TAK Portal `/locate/:slug` (unchanged).

## License

AGPL-3.0 — see [LICENSE](LICENSE).

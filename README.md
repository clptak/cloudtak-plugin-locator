# CloudTAK Locator Plugin

> **Variant: per-user Twilio sending (`feature/per-user-twilio`).**
> On this branch, locator SMS is sent **directly from the plugin using each user's own Twilio
> credentials** (entered in Settings, routed through CloudTAK's outbound proxy). Only users who
> supply valid Twilio credentials can send locator links. Locator create/list/archive still use
> the TAK Portal API. The `main` branch instead sends SMS via TAK Portal's Server Settings and
> gates access through the Authentik `page.locate` permission.

CloudTAK menu plugin for **cellphone ping / RTT / email parse** and **TAK Portal SMS locator** management.

Cellphone plotting code is **vendored in this repository** (`lib/cellphone/`, `components/cellphone/PingForm.vue`). You do not need [cloudtak-plugin-cellphone](https://github.com/clptak/cloudtak-plugin-cellphone) installed separately.

## Tabs

| Tab | Description |
|-----|-------------|
| **Cellphone Data** | Cell ping, RTT timing advance, and carrier email parse |
| **SMS Locator** | Create/list/archive locators via TAK Portal; send share links via the user's own Twilio account |
| **Settings** | TAK Portal base URL + connection test; per-user Twilio credentials + test SMS |

## Prerequisites

1. **TAK Portal** with the locate feature and your user granted `page.locate` on the portal. Locator API calls use the **CloudTAK → TAK Portal bridge** (`/api/takportal/locate/*`) — no cross-origin browser auth. See [TAK Portal bridge (CloudTAK API)](#tak-portal-bridge-cloudtak-api). The **TAK Portal Base URL** in Settings is still used for public share links (`/locate/{slug}`).

2. **TAK Portal Server Settings** — TAK URL/certs for relaying GPS pings to TAK Server. On this branch the portal's SMS provider is **not** used for locator links; sending is done from the plugin with the user's Twilio credentials.

3. **CloudTAK HTTP proxy** — **required** on this branch. The plugin sends SMS by POSTing to Twilio through CloudTAK's `/api/proxy`. A CloudTAK admin must enable the proxy and whitelist `https://api.twilio.com` under **Admin → Proxy** (origin-only entry, no path).

4. **Per-user Twilio credentials** — each operator enters their own **Account SID**, **Auth Token**, and **From Number** under **Locator → Settings**. These are stored in the browser (`localStorage`) for that user only. Users without valid credentials cannot send locator links — this is the access-control mechanism.

## Install

Only this plugin is required under `plugins/`:

```bash
git clone https://github.com/clptak/cloudtak-plugin-locator.git
ln -sf "$(pwd)/cloudtak-plugin-locator" ~/CloudTAK/api/web/plugins/locator
cd ~/CloudTAK/api/web && npm run serve
```

Open CloudTAK, load the map, and select **Locator** in the main menu.

If you previously installed `plugins/ping` (cloudtak-plugin-cellphone), you can remove that symlink — this plugin replaces it for the Cellphone Data tab.

## TAK Portal bridge (CloudTAK API)

The plugin calls **`/api/takportal/locate/*` on CloudTAK** (same origin). CloudTAK API forwards to internal TAK Portal (`http://tak-portal:3000/api/locate/*`) using the logged-in user's CloudTAK identity — no separate TAK Portal browser login and no CORS.

### CloudTAK API setup

Add route `CloudTAK/api/routes/takportal-locate.ts` and library `CloudTAK/api/lib/takportal-locate-bridge.ts` (included in CloudTAK when you merge/update), then rebuild **`cloudtak-api`**.

Environment variables on **`cloudtak-api`** (e.g. in `tak-stack/.env`):

| Variable | Purpose |
|----------|---------|
| `TAK_PORTAL_INTERNAL_URL` | Internal URL (default `http://tak-portal:3000`) |
| `TAK_PORTAL_BRIDGE_GLOBAL_GROUP` | Authentik group name injected for CloudTAK **system admins** — should match TAK Portal `PORTAL_AUTH_REQUIRED_GROUP` so they become portal global admins |
| `TAK_PORTAL_BRIDGE_EXTRA_GROUPS` | Optional `;`-separated groups added for **every** bridged request (e.g. a group that grants `page.locate` to standard users) |

**Permission mapping:** TAK Portal checks `page.locate` from portal roles/overrides. CloudTAK `system_admin` users get global portal admin when `TAK_PORTAL_BRIDGE_GLOBAL_GROUP` matches your portal admin group. Other users need matching groups in `TAK_PORTAL_BRIDGE_EXTRA_GROUPS` or per-user permission overrides in TAK Portal.

### Verify

After rebuilding CloudTAK API, **Test TAK Portal Connection** in Locator → Settings should return locator count without visiting TAK Portal in another tab.

---

## TAK Portal CORS (legacy direct browser calls)

<details>
<summary>Only needed if you bypass the bridge and call TAK Portal directly from the browser</summary>

The **SMS Locator** tab previously called TAK Portal directly from the browser with `credentials: 'include'`:

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

</details>

## How locator SMS works (per-user Twilio)

1. Plugin creates a locator via CloudTAK bridge → TAK Portal `/api/locate/locators` (TAK Portal generates the slug).
2. Plugin builds the public URL (`https://{portal}/locate/{slug}`) and a message body locally.
3. Plugin sends SMS to each number by POSTing to the Twilio Messages API **through CloudTAK's `/api/proxy`**, using the **current user's** Account SID / Auth Token / From Number from Settings.
4. Recipient opens the link; TAK Portal handles GPS pings and TAK Server relay.

Because sending requires the user's own Twilio credentials (and a CloudTAK-whitelisted proxy origin), a CloudTAK user without configured credentials cannot send locator links.

```mermaid
flowchart LR
    U[Operator in CloudTAK] -->|create locator| B[CloudTAK /api/takportal/locate]
    B -->|internal| P[TAK Portal /api/locate]
    U -->|send link| X[CloudTAK /api/proxy]
    X -->|whitelist check| T[api.twilio.com]
    T --> Ph[Recipient phone]
    Ph -->|opens link| L[TAK Portal /locate/:slug]
```

## Development

```bash
cd cloudtak-plugin-locator
npm install
npm run typecheck
```

## Architecture

- **Cellphone ping / RTT / email** → client-side GeoJSON → CloudTAK map worker (`lib/cellphone/`).
- **Locator CRUD / history / manual ping** → CloudTAK `/api/takportal/locate/*` bridge → internal TAK Portal (`api/tak-portal-client.ts`).
- **SMS send** → plugin builds the link + message, then POSTs to Twilio via CloudTAK `/api/proxy` using per-user credentials (`api/twilio-client.ts`, `lib/phone.ts`).
- **Public share page & GPS relay** → TAK Portal `/locate/:slug` (unchanged).

## License

AGPL-3.0 — see [LICENSE](LICENSE).

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

1. **TAK Portal** with the locate feature, SMS configured under **Server Settings → SMS** (Twilio or Brevo), and your user granted `page.locate`. CloudTAK and TAK Portal must share SSO so the browser can call TAK Portal APIs with `credentials: 'include'`. If they are on different subdomains (e.g. `cloudtak.*` and `takportal.*`), add CORS headers on TAK Portal for `/api/locate/*`.

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

## TAK Portal CORS (cross-subdomain)

When CloudTAK and TAK Portal are on different hosts (e.g. `https://cloudtak.example.com` and `https://takportal.example.com`), add CORS on the TAK Portal Caddy site for `/api/locate/*`, with `OPTIONS` handled **before** `forward_auth`. Allow origin = your CloudTAK URL and `Access-Control-Allow-Credentials: true`.

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

# AutoSigner

AutoSigner is a Nuxt app to manage publishing of custom iOS/tvOS apps. Managers upload `.ipa` files with their provisioning profile and certificate; the server signs them automatically and generates an OTA manifest.

Roles
- Superadmin: approves manager accounts
- Manager: uploads apps, certificates, profiles

Environment
- `DATABASE_URL` (SQLite by default)
- `CRYPTO_SECRET` (32+ chars)
- `PUBLIC_BASE_URL` (e.g. `https://your.domain`)

Core Endpoints
- `POST /api/auth/register` – create manager (pending)
- `POST /api/auth/login` – session cookie
- `GET /api/admin/approvals` + `POST /api/admin/approvals/:id` – superadmin approval
- `POST /api/apps/upload` – upload & sign IPA, generate manifest
- `GET /api/apps` – list apps

Installation link (open on iOS)
`itms-services://?action=download-manifest&url=<PUBLIC_BASE_URL>/uploads/<userId>/<appId>/manifest.plist`

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

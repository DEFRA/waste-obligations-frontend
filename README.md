# waste-obligations-frontend

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_waste-obligations-frontend&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_waste-obligations-frontend)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_waste-obligations-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_waste-obligations-frontend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_waste-obligations-frontend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_waste-obligations-frontend)

Core delivery platform Node.js Frontend Template.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Server-side Caching](#server-side-caching)
- [Redis](#redis)
- [Proxy](#proxy)
  - [Path-based reverse proxying](#path-based-reverse-proxying)
- [Local Development](#local-development)
  - [Setup](#setup)
    - [Nix dev shell (optional)](#nix-dev-shell-optional)
  - [Development](#development)
  - [HTTPS for local development](#https-for-local-development)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
  - [Formatting](#formatting)
    - [Windows prettier issue](#windows-prettier-issue)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Docker Compose](#docker-compose)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd waste-obligations-frontend
nvm use
```

You can alternatively use [mise-en-place](https://mise.jdx.dev/) with [`idiomatic_version_file_enable_tools`](https://mise.jdx.dev/configuration.html#idiomatic-version-files) enabled which will respect the [`.nvmrc`](.nvmrc).

## Server-side Caching

We use Catbox for server-side caching. By default the service will use CatboxRedis when deployed and CatboxMemory for
local development.
You can override the default behaviour by setting the `SESSION_CACHE_ENGINE` environment variable to either `redis` or
`memory`.

Please note: CatboxMemory (`memory`) is _not_ suitable for production use! The cache will not be shared between each
instance of the service and it will not persist between restarts.

## Redis

Redis is an in-memory key-value store. Every instance of a service has access to the same Redis key-value store similar
to how services might have a database (or MongoDB). All frontend services are given access to a namespaced prefixed that
matches the service name. e.g. `my-service` will have access to everything in Redis that is prefixed with `my-service`.

Redis I/O timeouts are configured in milliseconds. `REDIS_CONNECT_TIMEOUT_MS` defaults to 10 seconds, preserving the
previous ioredis connection timeout. `REDIS_COMMAND_TIMEOUT_MS` defaults to 5 seconds so a cache operation cannot wait
indefinitely for a response. Redis Cluster deployments also use `REDIS_CLUSTER_SLOTS_REFRESH_TIMEOUT_MS`, which defaults
to 10 seconds.

If your service does not require a session cache to be shared between instances or if you don't require Redis, you can
disable setting `SESSION_CACHE_ENGINE=false` or changing the default value in `src/config/index.js`.

## Proxy

We are using forward-proxy which is set up by default. To make use of this: `import { fetch } from 'undici'` then
because of the `setGlobalDispatcher(new ProxyAgent(proxyUrl))` calls will use the ProxyAgent Dispatcher

### Path-based reverse proxying

When a reverse proxy exposes this application below a path, it must remove that
path before forwarding the request and set a single `X-Forwarded-Prefix` header
containing the removed path. For example, a public request to
`/manage-recycling-obligations/compliance/...` is forwarded to the application
as `/compliance/...` with:

```http
X-Forwarded-Prefix: /manage-recycling-obligations
X-Forwarded-Proto: https
X-Forwarded-Host: service.example.gov.uk
```

The proxy must remove any client-supplied forwarded headers before setting its
own values. `X-Forwarded-Prefix` must be one path (for example
`/manage-recycling-obligations`), without a scheme, query string or comma-
separated values. Invalid values are ignored by the application.

The application applies the trusted prefix to every browser-facing local URL:

- links in the header, language switcher, sub-header back link, footer and
  compliance flow;
- local HTTP redirects, including sign-in and post-submission redirects;
- rendered JavaScript, stylesheet, font and image URLs; and
- all browser cookies, including session, CSRF and OAuth-state cookies.

For example, `/signin-oidc` becomes
`/manage-recycling-obligations/signin-oidc`, `/public/assets/...` becomes
`/manage-recycling-obligations/public/assets/...`, and cookies use
`Path=/manage-recycling-obligations`. This isolates the application from other
path-routed applications on the same host. Absolute URLs remain unchanged so
configured links to other services continue to work.

For Azure AD B2C, register the matching public callback URL, such as
`https://service.example.gov.uk/manage-recycling-obligations/signin-oidc`.

When two instances share a host, configure distinct values for
`SESSION_COOKIE_NAME`, `CSRF_COOKIE_NAME` and `AUTH_COOKIE_NAME`. Their
defaults are respectively `waste-obligations-session`,
`waste-obligations-csrf` and `waste-obligations-oauth-state`.

If you are not using Wreck, Axios or Undici or a similar http that uses `Request`. Then you may have to provide the
proxy dispatcher:

To add the dispatcher to your own client:

```javascript
import { ProxyAgent } from 'undici'

return await fetch(url, {
  dispatcher: new ProxyAgent({
    uri: proxyUrl,
    keepAliveTimeout: 10,
    keepAliveMaxTimeout: 10
  })
})
```

## Local Development

### Setup

Install application dependencies:

```bash
npm install
```

#### Nix dev shell (optional)

[`flake.nix`](./flake.nix) provides a dev shell with tools used by this repo.

Run `nix develop` or use [direnv](https://direnv.net/) to activate the development tools for this repo

We have not added nodejs to the nix shell, preferring nvm/mise due to more precise version pinning in order to to avoid unexpected behaviour differences across minor node versions.

### Git hooks

Install git hooks (optional)

```bash
npm run git:hooks
```

### Development

Local development uses the **obligations** profile in [epr-local-environment](https://github.com/DEFRA/epr-local-environment) for Waste Organisations, Waste Obligations, and Redis.

Start the backends:

```bash
cd ../epr-local-environment
docker compose --profile obligations up -d
```

Configure the frontend (copy [`.env.example`](./.env.example) if you do not have a `.env` yet):

```bash
cp .env.example .env
npm install
npm run dev
```

Open https://localhost:8010 (or http://localhost:8010 without local certs) — example compliance route (seeded organisation):

`/compliance/94bfc917-b9b6-45d7-847b-e5f500bfe198/certificate/submit?year=2026`

| Service             | Host URL              |
| ------------------- | --------------------- |
| waste-organisations | http://localhost:8006 |
| waste-obligations   | http://localhost:8007 |
| redis               | localhost:6379        |

The obligations profile also starts a packaged **waste-obligations-frontend** container on port **8008** (and an HTTPS proxy on **8010**). Stop those when you develop with `npm run dev` on port 8010 so you are not accidentally using the wrong instance:

```bash
cd ../epr-local-environment
docker compose --profile obligations stop waste-obligations-frontend waste-obligations-frontend-proxy
```

Backends (APIs, Redis, and the rest of the stack) keep running. To start the packaged frontend again later:

```bash
docker compose --profile obligations start waste-obligations-frontend waste-obligations-frontend-proxy
```

### HTTPS for local development

Azure AD B2C will only redirect back to an HTTPS URL, so the app needs to serve
HTTPS locally for end-to-end auth flows to work.

The server enables TLS automatically when **both** are true:

1. `NODE_ENV=development` (set by `npm run dev`)
2. `certs/localhost-key.pem` and `certs/localhost-cert.pem` exist at the repo root

In production the app continues to serve plain HTTP behind an edge terminator —
this setup is dev-only.

To generate a trusted local cert pair, install [mkcert] and run:

```bash
npm run setup:certs
```

Then start the app as normal:

```bash
npm run dev
```

The startup log will show `https://localhost:3000` once TLS is active. Set
`AUTH_COOKIE_SECURE=true` and `SESSION_COOKIE_SECURE=true` in `.env` so cookies
are marked secure.

When using the **epr-local-environment** HTTPS proxy instead, register
`https://localhost:8010/signin-oidc` as an Azure AD B2C callback URL and use the
same secure cookie flags.

[mkcert]: https://github.com/FiloSottile/mkcert

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
```

## Docker

### Development image

> [!TIP]
> For Apple Silicon users, you may need to add `--platform linux/amd64` to the `docker run` command to ensure
> compatibility fEx: `docker build --platform=linux/arm64 --no-cache --tag waste-obligations-frontend`

Build:

```bash
docker build --target development --no-cache --tag waste-obligations-frontend:development .
```

Run:

```bash
docker run -p 3000:3000 waste-obligations-frontend:development
```

### Production image

Build:

```bash
docker build --no-cache --tag waste-obligations-frontend .
```

Run:

```bash
docker run -p 3000:3000 waste-obligations-frontend
```

### Docker Compose

Runs only this frontend container. Start [epr-local-environment](https://github.com/DEFRA/epr-local-environment) with the **obligations** profile first so APIs and Redis are available on the host.

```bash
docker compose up --build -d
```

The container reaches host services via `host.docker.internal` (APIs on **8006** / **8007**, Redis on **6379**). Override with environment variables if needed — see [`.env.example`](./.env.example).

### Dependabot

We have added an example dependabot configuration file to the repository. You can enable it by renaming
the [.github/example.dependabot.yml](.github/example.dependabot.yml) to `.github/dependabot.yml`

### SonarCloud

Instructions for setting up SonarCloud can be found in [sonar-project.properties](./sonar-project.properties).

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.

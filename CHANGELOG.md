# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0](https://github.com/onix-net/gecx-shopping-agent-demo/compare/v0.2.3...v0.3.0) (2026-10-05)


### Features

* run catalog import from CI and align the documentation with the deployed stack ([#41](https://github.com/onix-net/gecx-shopping-agent-demo/issues/41)) ([2879389](https://github.com/onix-net/gecx-shopping-agent-demo/commit/2879389ce167e53f5633607434e66971657a0bb8))


### Bug Fixes

* **search:** hydrate live Retail results from the catalog ([#46](https://github.com/onix-net/gecx-shopping-agent-demo/issues/46)) ([0b7bfe4](https://github.com/onix-net/gecx-shopping-agent-demo/commit/0b7bfe49579a95c5e9e136e911046489028a47ea))

## [0.2.3](https://github.com/onix-net/gecx-shopping-agent-demo/compare/v0.2.2...v0.2.3) (2026-10-02)


### Bug Fixes

* **search:** prevent blank page on missing facet values and eliminate external catalog CORS errors ([#43](https://github.com/onix-net/gecx-shopping-agent-demo/issues/43)) ([6ef1026](https://github.com/onix-net/gecx-shopping-agent-demo/commit/6ef1026c2a68968a17e34e5eee648071062fec9d))

## [0.2.2](https://github.com/onix-net/gecx-shopping-agent-demo/compare/v0.2.1...v0.2.2) (2026-10-02)


### Bug Fixes

* **proxy:** enforce production metadata precedence and safe token cache ttl ([#38](https://github.com/onix-net/gecx-shopping-agent-demo/issues/38)) ([e69a695](https://github.com/onix-net/gecx-shopping-agent-demo/commit/e69a69502204bd92484ba108d7a1b00eca34ad75))

## [0.2.1](https://github.com/onix-net/gecx-shopping-agent-demo/compare/v0.2.0...v0.2.1) (2026-10-02)


### Bug Fixes

* **ci:** read the pushed digest from docker, not from Artifact Registry ([#37](https://github.com/onix-net/gecx-shopping-agent-demo/issues/37)) ([f93c4ff](https://github.com/onix-net/gecx-shopping-agent-demo/commit/f93c4ffd0d8b913d36a695162c1e63c2ab9e1603))

## [0.2.0](https://github.com/onix-net/gecx-shopping-agent-demo/compare/v0.1.0...v0.2.0) (2026-10-02)


### Features

* add a test suite, quality gates and a release process ([#19](https://github.com/onix-net/gecx-shopping-agent-demo/issues/19)) ([cc53725](https://github.com/onix-net/gecx-shopping-agent-demo/commit/cc537258174cbf3abb604a223d2cf23c3c9bfaa6))
* bootstrap onix-review ([#1](https://github.com/onix-net/gecx-shopping-agent-demo/issues/1)) ([fa72f09](https://github.com/onix-net/gecx-shopping-agent-demo/commit/fa72f09949d2973964c57a79054c877003958413))
* **bus:** correlate agent action dispatches and emit outcome envelope ([#32](https://github.com/onix-net/gecx-shopping-agent-demo/issues/32)) ([6bdaa7a](https://github.com/onix-net/gecx-shopping-agent-demo/commit/6bdaa7a8bb32d878e524d69240b8f9a6c5d80e69))
* **infra:** manage the dev environment with OpenTofu and Terragrunt ([#34](https://github.com/onix-net/gecx-shopping-agent-demo/issues/34)) ([0b55fab](https://github.com/onix-net/gecx-shopping-agent-demo/commit/0b55fab714331242670c2c2e3543e9d85c9c8d8d))


### Bug Fixes

* /api/health reports live mode while the upstream is broken ([#29](https://github.com/onix-net/gecx-shopping-agent-demo/issues/29)) ([991df3d](https://github.com/onix-net/gecx-shopping-agent-demo/commit/991df3dc16a9c5586e893035b481640f5c3795bf))
* add google-auth-library and install runtime deps in Dockerfile ([#23](https://github.com/onix-net/gecx-shopping-agent-demo/issues/23)) ([ed8a19a](https://github.com/onix-net/gecx-shopping-agent-demo/commit/ed8a19a51997eb3a6d8d10a3d31e1e311525301b))
* **build:** stop the prepare script breaking npm ci wherever scripts/ is absent ([#25](https://github.com/onix-net/gecx-shopping-agent-demo/issues/25)) ([ec907ae](https://github.com/onix-net/gecx-shopping-agent-demo/commit/ec907aeb524b3ce0aeb1d3dfbdc722fa4fed26df))
* **bus:** correlate agent action dispatches and harden retail catalog ingestion ([#35](https://github.com/onix-net/gecx-shopping-agent-demo/issues/35)) ([bdec434](https://github.com/onix-net/gecx-shopping-agent-demo/commit/bdec434584ac9d5625e6c1dbcec542e7c10b76ec))
* **ci:** run release-please under an App token so release CI actually runs ([#22](https://github.com/onix-net/gecx-shopping-agent-demo/issues/22)) ([b301d56](https://github.com/onix-net/gecx-shopping-agent-demo/commit/b301d5623e495cf6d54d902d91808aedcbb94460))
* **ci:** stop the format gate failing every release pull request ([#21](https://github.com/onix-net/gecx-shopping-agent-demo/issues/21)) ([6f4f81c](https://github.com/onix-net/gecx-shopping-agent-demo/commit/6f4f81c9814acfb7a5270c7607a0797e006a68cb))
* correct agent action bus defects and prove the wiring by behaviour ([#27](https://github.com/onix-net/gecx-shopping-agent-demo/issues/27)) ([5731bcf](https://github.com/onix-net/gecx-shopping-agent-demo/commit/5731bcf9acd89ac86ca689e337c6e9924d713d49))
* empty search results ([#24](https://github.com/onix-net/gecx-shopping-agent-demo/issues/24)) ([1730e96](https://github.com/onix-net/gecx-shopping-agent-demo/commit/1730e963c0b5a25d1fd2babd5a16b988a669f3bb))
* **events:** ingest validated events to Retail API, consolidate purchase transaction, and align privacy copy ([#30](https://github.com/onix-net/gecx-shopping-agent-demo/issues/30)) ([623b5fc](https://github.com/onix-net/gecx-shopping-agent-demo/commit/623b5fce869e118b9a7b7d86a5ddcb696436471e))
* **iam:** isolate runtime service account and enforce least privilege ([#33](https://github.com/onix-net/gecx-shopping-agent-demo/issues/33)) ([3ad2b27](https://github.com/onix-net/gecx-shopping-agent-demo/commit/3ad2b27c25e2f974662449cd17a12bd88e2735c7))
* **proxy:** derive client IP from trusted proxy and bound rate limiter cache ([#31](https://github.com/onix-net/gecx-shopping-agent-demo/issues/31)) ([740b208](https://github.com/onix-net/gecx-shopping-agent-demo/commit/740b2087ca08984ece70c40710e8de97a32f4c58))
* **retail-import:** resolve invalid bash syntax, switch to gcloud sto… ([#16](https://github.com/onix-net/gecx-shopping-agent-demo/issues/16)) ([a76c848](https://github.com/onix-net/gecx-shopping-agent-demo/commit/a76c848de8e1be8d12c2249ecb93670741b35f55))
* **security:** exclude env and credential files in dockerignore and gcloudignore ([#12](https://github.com/onix-net/gecx-shopping-agent-demo/issues/12)) ([#18](https://github.com/onix-net/gecx-shopping-agent-demo/issues/18)) ([d363532](https://github.com/onix-net/gecx-shopping-agent-demo/commit/d363532bae499dcdb62756107b6588e37976d05b))
* **security:** resolve product IDs against canonical catalog and boun… ([#17](https://github.com/onix-net/gecx-shopping-agent-demo/issues/17)) ([ffd1827](https://github.com/onix-net/gecx-shopping-agent-demo/commit/ffd1827c1fc7478f29b17926cb64558e98463b68))


### Documentation

* reconcile the documentation with what the code now does ([#26](https://github.com/onix-net/gecx-shopping-agent-demo/issues/26)) ([eceaed7](https://github.com/onix-net/gecx-shopping-agent-demo/commit/eceaed73cd03eae8fa48e02bd5bb8ed7ca12eea5))

## [Unreleased]

### Fixed
- Added `google-auth-library` to dependencies in `package.json` to resolve missing dependency error in `getGcpAccessToken()`.
- Updated `Dockerfile` runner stage to install production dependencies (`npm ci --omit=dev`) so that the local auth fallback works in Google Cloud Run.

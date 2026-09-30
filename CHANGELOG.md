# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- Added `google-auth-library` to dependencies in `package.json` to resolve missing dependency error in `getGcpAccessToken()`.
- Updated `Dockerfile` runner stage to install production dependencies (`npm ci --omit=dev`) so that the local auth fallback works in Google Cloud Run.

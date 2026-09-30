# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- Fixed bug where empty search results were ignored and not displayed correctly in the UI. Empty results are now treated as valid and request cancellation was added to prevent race conditions.
- Added `google-auth-library` to dependencies in `package.json` to resolve missing dependency error in `getGcpAccessToken()`.
- Updated `Dockerfile` runner stage to install production dependencies (`npm ci --omit=dev`) so that the local auth fallback works in Google Cloud Run.

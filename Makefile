.DEFAULT_GOAL := help
.PHONY: help setup hooks lint format format-check typecheck test coverage check check-fast build lint-shell

help: ## List targets
	@grep -E '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "} {printf "  %-14s %s\n", $$1, $$2}'

setup: ## Install dependencies exactly as locked
	npm ci

# The deliberate path. `npm ci` installs the hooks on its own, but skips it when
# core.hooksPath points outside the repo, because installing there overwrites
# hooks that belong to something else -- and their .old backups on a second run.
# This target does not wave that through: it refuses the same case and prints
# what it would have destroyed. Overriding it takes a second, explicit token,
# LEFTHOOK_CLOBBER_GLOBAL_HOOKS=1, so nothing irreversible happens by accident.
hooks: ## Install the lefthook git hooks (refuses a core.hooksPath outside the repo)
	npm run hooks

lint-openapi: ## Ensure root openapi.yaml and public/openapi.yaml remain byte-identical
	@cmp -s openapi.yaml public/openapi.yaml || (echo "ERROR: openapi.yaml and public/openapi.yaml are out of sync" >&2 && exit 1)

lint: lint-openapi ## Lint
	npm run lint

format: ## Rewrite files with Prettier
	npm run format

format-check: ## Fail if anything is unformatted
	npm run format:check

typecheck: ## Typecheck without emitting
	npx tsc --noEmit

test: ## Run the test suite once
	npm test

coverage: ## Run the suite with coverage
	npm run coverage

build: ## Production build
	npm run build

# Catches shellcheck classes only. Does not catch runtime parameter-expansion errors like bad substitution.
#
# The explicit empty guard and -0 are both deliberate. xargs -r is a GNU
# extension that BSD xargs, which is what macOS ships, need not accept, and null
# separation also survives paths with spaces and tracked-but-deleted files.
lint-shell: ## Lint shell scripts
	@if ! command -v shellcheck >/dev/null 2>&1; then \
		if [ "$${CI:-}" = "true" ] || [ -n "$${GITHUB_ACTIONS:-}" ]; then \
			echo "ERROR: shellcheck is required in CI environments but was not found" >&2; \
			exit 1; \
		fi; \
		echo "shellcheck not found; skipping shell linting locally (install via 'brew install shellcheck')"; \
		exit 0; \
	fi; \
	files=$$(git ls-files '*.sh'); \
	if [ -z "$$files" ]; then echo "no shell scripts"; exit 0; fi; \
	git ls-files -z '*.sh' | xargs -0 shellcheck

# build sits in the gate because a change can typecheck, lint and test green and
# still fail to bundle -- and because the build is what CI hands to the image
# build. The lifecycle is format, lint, build, test, in that order.
check: lint format-check typecheck build coverage lint-shell ## Everything CI gates on

# What the pre-commit hook runs. Same linters, same typecheck, same tests --
# it differs from `check` only in skipping the coverage instrumentation, the
# threshold gate and the production build, the three slowest stages. CI runs
# the full `check`, so nothing is lost; a hook that costs too much per commit
# just gets skipped with --no-verify.
check-fast: lint format-check typecheck test lint-shell ## The subset the pre-commit hook runs

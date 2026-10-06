TG := terragrunt
TOFU := tofu
LIVE := live
MODULES := $(wildcard modules/*)

.PHONY: fmt fmt-check validate lint test test-scripts check

fmt:
	@if [ -d modules ]; then $(TOFU) fmt -recursive modules; fi
	$(TG) hcl fmt

fmt-check:
	@if [ -d modules ]; then $(TOFU) fmt -check -recursive modules; fi
	$(TG) hcl fmt --check --diff

validate:
	$(TG) hcl validate --working-dir $(LIVE)

lint:
	@for m in $(MODULES); do echo "== $$m"; (cd $$m && tflint --init --config $(CURDIR)/.tflint.hcl && tflint --config $(CURDIR)/.tflint.hcl) || exit 1; done

test:
	@for m in $(MODULES); do \
	  if [ -d "$$m/tests" ]; then echo "== $$m"; (cd $$m && $(TOFU) init -backend=false -input=false >/dev/null && $(TOFU) test) || exit 1; fi; \
	done

# Only the offline script tests. tests/test-bootstrap-state.sh talks to GCP and
# takes a project argument, so it is run by hand, not here.
test-scripts:
	scripts/tests/test-env-facts.sh

check: fmt-check validate lint test test-scripts

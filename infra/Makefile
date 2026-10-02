TG := terragrunt
TOFU := tofu
LIVE := live
MODULES := $(wildcard modules/*)

.PHONY: fmt fmt-check validate lint test check

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

check: fmt-check validate lint test

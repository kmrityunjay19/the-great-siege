# The Great Siege — single front door for the build pipeline.
# Everything here is a thin wrapper over scripts/ so the commands are discoverable.
.DEFAULT_GOAL := help
.PHONY: help serve build build-local stage check package patches test clean

PORT ?= 8765

help: ## show this help
	@echo "The Great Siege"
	@echo
	@grep -hE '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | sed 's/:.*## /\t/' | expand -t26
	@echo
	@echo "site/ is generated from build/ + web/ by \`make stage\`; never hand-edit it."

serve: ## serve site/ on http://127.0.0.1:$(PORT)/
	@python3 site/serve.py --port $(PORT)

build: ## full engine rebuild via autotools + emconfigure -> build/
	@scripts/build.sh

build-local: ## reproducible engine compile without system autotools -> build/
	@python3 scripts/build-local.py

stage: ## regenerate site/ from build/ + web/
	@python3 scripts/stage-site.py

check: ## verify site/ still matches build/ + web/ and report stray files
	@python3 scripts/stage-site.py --check

package: ## build dist/7kaa-web-itch.zip from build/
	@scripts/make-itch-zip.sh

patches: ## re-export src/patches/ from src/engine's web-port branch
	@scripts/refresh-patches.sh

test: ## run the presentation-layer tests
	@node --test tests/

clean: ## delete intermediate build output (never site/)
	@rm -rf build/7kaa.html build/7kaa.js build/7kaa.wasm build/7kaa.data \
	        build/extras.js build/extras.data build/objects
	@echo "removed intermediate build output; site/ untouched"

.PHONY: install check opencode-build

OPENCODE_FORK ?= https://github.com/irron2004/oh-my-opencode.git
OPENCODE_BRANCH ?= dev

install:
	bun install --frozen-lockfile

check:
	bun run check

opencode-build:
	@build_dir="$$(mktemp -d -t oh-my-opencode-build.XXXXXX)"; \
	trap 'rm -rf -- "$$build_dir"' EXIT HUP INT TERM; \
	git clone --depth 1 --branch "$(OPENCODE_BRANCH)" "$(OPENCODE_FORK)" "$$build_dir"; \
	npm install -g "$$build_dir"

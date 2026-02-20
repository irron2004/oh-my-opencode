.PHONY: opencode-build

OPENCODE_FORK ?= https://github.com/irron2004/oh-my-opencode.git
OPENCODE_BRANCH ?= dev
OPENCODE_TMP ?= /tmp/oh-my-opencode-build

opencode-build:
	rm -rf "$(OPENCODE_TMP)"
	git clone --depth 1 --branch "$(OPENCODE_BRANCH)" "$(OPENCODE_FORK)" "$(OPENCODE_TMP)"
	npm install -g "$(OPENCODE_TMP)"

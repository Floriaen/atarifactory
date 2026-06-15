# Game Factory — one-command setup & run.
# Targets assume the step-1 skeleton (package.json scripts: dev, test, test:e2e, lint, view-run).

SHELL := /bin/bash
TRACE ?=

.DEFAULT_GOAL := help

help: ## list targets
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n",$$1,$$2}'

setup: ## install deps + create .env if missing
	npm install
	@test -f .env || (printf "ANTHROPIC_API_KEY=\n" > .env && echo "created .env — add your ANTHROPIC_API_KEY")

run: ## generate a game design (fully autonomous — no input)
	npm run dev

start: setup run ## ONE COMMAND: setup then run

batch: ## run the design phase N times and cache results:  make batch N=10 C=3
	npm run batch -- N=$(or $(N),10) C=$(or $(C),3)

art: ## generate sprites for a cached design:  make art [I=0 | TRACE=<id>]
	npm run art -- I=$(or $(I),0) $(if $(TRACE),TRACE=$(TRACE),)

code: ## build a playable game from a cached design:  make code [I=0 | TRACE=<id>] [ART=<artId>]
	npm run code -- I=$(or $(I),0) $(if $(TRACE),TRACE=$(TRACE),) $(if $(ART),ART=$(ART),)

play: ## serve a built bundle in the browser:  make play TRACE=<id>
	npm run play -- TRACE=$(TRACE)

serve: ## run the pipeline service alone (REST API :8910 — needs ANTHROPIC_API_KEY)
	@echo "[pipeline] http://127.0.0.1:8910"
	npm run serve

admin: ## run the full stack: pipeline :8910 + admin API :8787 + web :5173
	@echo "[pipeline] :8910  ·  [admin] API :8787  ·  web :5173"
	npm run serve & PIPE=$$!; \
	npm run admin:server & SVR=$$!; \
	trap 'kill $$PIPE $$SVR 2>/dev/null' INT TERM EXIT; \
	npm run admin:web

test: ## tiers 1–3 (deterministic, no network)
	npm test

test-e2e: ## one gated live-Claude run (needs ANTHROPIC_API_KEY)
	RUN_REAL_LLM=1 npm run test:e2e

view: ## inspect a run trace:  make view TRACE=<traceId>
	npm run view-run -- $(TRACE)

lint: ## eslint
	npm run lint

clean: ## remove build + run artifacts + deps
	rm -rf dist runs node_modules

.PHONY: help setup run start batch art code play serve admin test test-e2e view lint clean

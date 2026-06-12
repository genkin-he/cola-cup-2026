# Cup 2026 (Rails) — deploy helpers
#
# Single-container production deploy via docker compose, with hashed assets
# (js/css/fonts) offloaded to Cloudflare Pages like the old Next.js stack:
#   make deploy   — build image, extract /assets, push to Pages CDN
#   make publish  — deploy assets first, then restart on the SAME build
#                   (HTML digests must match what's already on the CDN)
# Requires a logged-in wrangler (or CLOUDFLARE_API_TOKEN) and in .env:
#   ASSET_HOST=https://cup-assets.pages.dev
# SQLite data lives on the ./storage volume and survives rebuilds; pending
# migrations run automatically on boot (entrypoint db:prepare).

ASSET_PROJECT ?= cup-assets

.PHONY: deploy publish build up status logs console restart

# Build + push static assets to Cloudflare Pages. Run after every code change.
deploy:
	ASSET_PROJECT=$(ASSET_PROJECT) bin/deploy-assets

# Push assets to the CDN, then restart the container with the matching image
# (deploy already built it — no rebuild here, hashes must stay in sync).
publish: deploy
	docker compose up -d
	@sleep 5
	@$(MAKE) --no-print-directory status

build:
	docker compose build

up:
	docker compose up -d

status:
	docker compose ps
	@curl -sf -o /dev/null -w "health /up -> %{http_code}\n" http://localhost:8026/up || echo "health /up -> FAILED"

logs:
	docker compose logs -f --tail 100

# Rails console inside the running container.
console:
	docker compose exec app ./bin/rails console

restart:
	docker compose restart

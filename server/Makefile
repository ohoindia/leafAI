build-Api:
	cp package.json package-lock.json tsconfig.json "$(ARTIFACTS_DIR)/"
	cp -R src "$(ARTIFACTS_DIR)/src"
	cd "$(ARTIFACTS_DIR)" && npm ci --include=dev && npm run build && npm prune --omit=dev

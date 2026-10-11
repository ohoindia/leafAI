# Shared client and mobile code

- `api.js`: API endpoints, fetch transport, HTTP errors, and upload rules. Browser refresh cookies and native API origins are handled by each app.
- `content.js`: product naming, screen titles, languages, photo guidance, consent copy, care tips, voice commands, status labels, and history filtering.
- `copy.js`: English, Telugu, Hindi, Kannada, and Tamil copy.
- `types.ts`: API response types used by mobile; declaration files describe the shared JavaScript exports.

Both apps import these files directly. Metro watches this directory through `mobile/metro.config.js`. Keep platform modules and secrets out of this folder.

- `market-locales.js`: market labels, MSP names, explanations, and feed status messages for all supported languages. Unknown provider names remain readable in their original form.
- Existing databases must apply `database/migrations/20261011_add_kannada_tamil.sql` before deploying Kannada/Tamil account and analysis support. New analysis results include both languages in `analysis_json`; older results retain their original translations.

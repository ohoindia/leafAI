# Shared client and mobile code

- `api.js`: API endpoints, fetch transport, HTTP errors, and upload rules. Browser refresh cookies and native API origins are handled by each app.
- `content.js`: product naming, screen titles, languages, photo guidance, consent copy, care tips, voice commands, status labels, and history filtering.
- `copy.js`: English, Telugu, and Hindi copy.
- `types.ts`: API response types used by mobile; declaration files describe the shared JavaScript exports.

Both apps import these files directly. Metro watches this directory through `mobile/metro.config.js`. Keep platform modules and secrets out of this folder.

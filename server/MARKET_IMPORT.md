# Stored mandi prices

The client and mobile market endpoint now reads MySQL only. Opening Mandi does
not contact a government API or reverse geocoder. Prices include their report
date and `syncedAt` gives the last successful import time. Previously committed
pages remain available after a provider outage. New reports and corrections
are committed one page at a time, with an import ledger for failures and counts.

## Install and first import

Configure the existing `DATA_GOV_IN_API_KEY` in the server environment, then run:

```powershell
npm --prefix server run market:migrate
npm --prefix server run market:import
```

The first successful scan accepts reports from today and the preceding 120
calendar days. Later scans accept today and the preceding 10 calendar days.
The importer reads every page, with no 20-page cap. Dates are computed in India
time. State, district, mandi, commodity, variety, and grade use normalized tables.
One unique price report exists per mandi, variety, grade, and date. Unchanged
reports are skipped entirely; corrections update only the changed report.
Imports acquire a connection-scoped MySQL advisory lock, so overlapping
scheduled/manual imports cannot race. Failed scans can be rerun safely.

**Historical source limitation:** the configured data.gov.in resource is a
current snapshot. Live requests with past arrival-date filters returned current
records, so it cannot provide an actual 120-day archive or refetch corrections
for every prior day. We store all available reports inside the requested window
and accumulate history over time, but `historical_backfill_complete` remains
false. A historical archive/API credential is still needed to complete the full
backfill. Do not interpret a successful snapshot scan as 120 days of coverage.
All available commodities are imported, rather than only the bundled common
crop list. No data is deleted when it disappears from a later provider snapshot.

## Twice-daily schedule

AWS SAM configures EventBridge Scheduler for **03:00 and 15:00 Asia/Kolkata**,
without a flexible execution window. Apply the migration and initial import
before deploying `server/template.yaml`. Ensure the API Lambda environment has
`DATA_GOV_IN_API_KEY`; it is also supported through the existing Secrets Manager
loader. `MarketScheduleEnabled=false` disables the cloud schedule. The scheduled
job uses the existing Lambda, aborts before its timeout, and gets two retries.
Cloud deployment is required to activate the schedule; local files alone do not
change a deployed stack. Failures are visible in the import ledger and Lambda
logs; prices already in MySQL continue to be served.

For a continuously running Node server, set `MARKET_SCHEDULER_ENABLED=true`.
Its timer invokes the same importer during the 03:00/15:00 India-time slots.
Keep the server running; a stopped process cannot execute a schedule. Multiple
instances remain safe through the database lock. Avoid enabling both mechanisms
for the same deployment to save redundant scans.

Nearby queries first select mandis by indexed stored coordinates and exact
distance, then return their latest and previous reports from the 120-day window.
Markets whose locations cannot be resolved from the bundled place data are
still stored and available through state/district queries. API pagination uses
50 mandis per page. The database requires MySQL 8 for window functions.

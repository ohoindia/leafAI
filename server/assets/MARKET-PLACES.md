Indian town coordinates derived from GeoNames, downloaded 13 October 2026.

Source: https://download.geonames.org/export/dump/IN.zip
Administrative names: admin1CodesASCII.txt and admin2Codes.txt from the same directory.
License: Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/
Attribution: GeoNames, https://www.geonames.org/

Refresh with `python server/scripts/update-market-places.py`.
All populated places are included in compressed files by state; only potentially
nearby states are loaded. Names and aliases are
matched within the reported state; ambiguous town names are matched to their
district; mismatches and ambiguous names are excluded. Coordinates describe town centres,
not mandi gates. Distances are approximate straight-line distances, not driving
distances. Unresolved markets are excluded from radius results and counted in
the API response so missing coverage is visible.

Public AGMARKNET metadata is stored in `agmarknet-markets.json`; refresh with
`node --use-system-ca server/scripts/update-agmarknet-markets.mjs`.
It maps 28 common crops to their reporting markets. Recent price reports come
from the public `/v1/prices-and-arrivals/commodity-price/lastweek` endpoint at
https://api.agmarknet.gov.in, verified against the official frontend at
https://agmarknet.gov.in. No captcha-protected report endpoints are used.
Each general API page checks at most 45 market/crop pairs; a specific crop can
check up to three batches if earlier batches have no prices, within an 18-second
budget. Requests run with three concurrent workers
and a 15-minute cache. The response includes a next-page offset and flags failures.
Weekly records retain their price dates and compare with the previous non-missing
price in the same market, crop, variety and units. They do not provide minimum
or maximum prices. Trends are not transferred to a newer daily report.

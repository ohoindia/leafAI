"""Refresh the offline Indian town coordinates used for approximate mandi distances.

Source: https://download.geonames.org/export/dump/ (CC BY 4.0).
No API credentials are required. Run from any working directory.
"""
import io
import json
import pathlib
import urllib.request
import zipfile
import gzip
import re
import unicodedata

BASE = "https://download.geonames.org/export/dump/"

def download(name):
    return urllib.request.urlopen(BASE + name, timeout=90).read()

states = {}
for line in download("admin1CodesASCII.txt").decode("utf-8").splitlines():
    fields = line.split("\t")
    if fields[0].startswith("IN."):
        states[fields[0].split(".")[1]] = fields[2]

districts = {}
for line in download("admin2Codes.txt").decode("utf-8").splitlines():
    fields = line.split("\t")
    if fields[0].startswith("IN."):
        districts[fields[0]] = fields[2]

places = {}
with zipfile.ZipFile(io.BytesIO(download("IN.zip"))) as archive:
    for line in archive.read("IN.txt").decode("utf-8").splitlines():
        f = line.split("\t")
        # Populated places only: never substitute district/state centroids.
        if f[6] != "P" or f[10] not in states:
            continue
        names = list(dict.fromkeys([f[1], f[2], *f[3].split(",")]))
        places.setdefault(states[f[10]], []).append([states[f[10]], districts.get("IN." + f[10] + "." + f[11], ""),
                       [n for n in names if n], float(f[4]), float(f[5]), int(f[14] or 0)])

target = pathlib.Path(__file__).resolve().parents[1] / "assets" / "market-places"
target.mkdir(exist_ok=True)
for state, rows in places.items():
    name = re.sub("[^a-z0-9]", "", unicodedata.normalize("NFKD", state).encode("ascii", "ignore").decode().lower())
    data = json.dumps(rows, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    (target / (name + ".json.gz")).write_bytes(gzip.compress(data, mtime=0))
    places[state] = {"minLat": min(r[3] for r in rows), "maxLat": max(r[3] for r in rows), "minLon": min(r[4] for r in rows), "maxLon": max(r[4] for r in rows)}
(target / "bounds.json").write_text(json.dumps({re.sub("[^a-z0-9]", "", s.lower()): b for s, b in places.items()}), encoding="utf-8")
print(f"Wrote populated places across {len(places)} compressed state files")

#!/usr/bin/env python3
"""Fetch the CHEP 2026 programme from the Indico HTTP export API.

Writes the raw JSON to tools/cache/chep_raw.json. Re-run whenever the Indico
timetable changes (talk order / numbering shifts as the schedule firms up).

Pure standard library -- no dependencies, runs anywhere with network access to
indico.cern.ch (public event, no auth needed).
"""
import json
import os
import urllib.request

EVENT_ID = 1471803
TZ = "Asia/Bangkok"  # event-local time, so slot times match the on-site programme
URL = (
    f"https://indico.cern.ch/export/event/{EVENT_ID}.json"
    f"?detail=contributions&tz={TZ}"
)
OUT = os.path.join(os.path.dirname(__file__), "cache", "chep_raw.json")


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    print(f"Fetching {URL}")
    req = urllib.request.Request(URL, headers={"User-Agent": "chep-graph-builder"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    contribs = json.loads(data).get("results", [{}])[0].get("contributions", [])
    with open(OUT, "wb") as f:
        f.write(data)
    print(f"Wrote {OUT}  ({len(data):,} bytes, {len(contribs)} contributions)")


if __name__ == "__main__":
    main()

"""
Pull daily PM2.5 for donor cities (Tunis, Casablanca, Cairo) from OpenAQ API v3.

Requirements:
  pip install requests pandas
  Free API key from https://openaq.org/ (sign up, copy your API key)

Then run:
  OPENAQ_KEY=your_key_here python fetch_openaq.py

What this does:
  1. Find monitoring locations near each city (US Embassy / reference-grade preferred)
  2. Fetch hourly PM2.5 for 2019-04-25 -> 2025-03-04
  3. Aggregate to daily means
  4. Save one CSV per city
"""
import os, time, requests, pandas as pd
from datetime import datetime, timezone

API_KEY = os.environ.get("OPENAQ_KEY", "").strip()
if not API_KEY:
    raise SystemExit("Set OPENAQ_KEY env var (get free key at https://openaq.org/)")

BASE = "https://api.openaq.org/v3"
HEADERS = {"X-API-Key": API_KEY}

CITIES = {
    "tunis":      {"lat": 36.8065, "lon": 10.1815, "radius_m": 25000},
    "casablanca": {"lat": 33.5731, "lon": -7.5898, "radius_m": 25000},
    "cairo":      {"lat": 30.0444, "lon": 31.2357, "radius_m": 25000},
}

START = "2019-04-25T00:00:00Z"
END   = "2025-03-04T23:59:59Z"

def find_pm25_locations(lat, lon, radius):
    """Find locations within radius that measure PM2.5."""
    # /v3/locations supports bbox + parameters_id (PM2.5 = 2)
    params = {
        "coordinates": f"{lat},{lon}",
        "radius": radius,
        "parameters_id": 2,   # PM2.5
        "limit": 100,
    }
    r = requests.get(f"{BASE}/locations", headers=HEADERS, params=params, timeout=30)
    r.raise_for_status()
    return r.json().get("results", [])

def fetch_sensor_measurements(sensor_id, start, end):
    """Fetch hourly measurements for a sensor. Paginates if needed."""
    rows = []
    page = 1
    while True:
        params = {
            "datetime_from": start,
            "datetime_to": end,
            "limit": 1000,
            "page": page,
        }
        r = requests.get(f"{BASE}/sensors/{sensor_id}/measurements/hourly",
                         headers=HEADERS, params=params, timeout=60)
        if r.status_code != 200:
            print(f"  sensor {sensor_id} page {page}: HTTP {r.status_code}")
            break
        batch = r.json().get("results", [])
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < 1000:
            break
        page += 1
        time.sleep(0.3)  # be kind to the API
    return rows

for city, meta in CITIES.items():
    print(f"\n=== {city} ===")
    locs = find_pm25_locations(meta["lat"], meta["lon"], meta["radius_m"])
    print(f"  Found {len(locs)} candidate PM2.5 locations")
    if not locs:
        print(f"  [!] No PM2.5 locations for {city} — skipping")
        continue

    all_rows = []
    for loc in locs[:5]:  # cap at 5 locations per city to avoid very long runs
        loc_name = loc.get("name", "?")
        print(f"  Location: {loc_name} (id={loc['id']})")
        # Find the PM2.5 sensor for this location
        for sensor in loc.get("sensors", []):
            if sensor.get("parameter", {}).get("name") == "pm25":
                sid = sensor["id"]
                print(f"    sensor {sid}: fetching...")
                batch = fetch_sensor_measurements(sid, START, END)
                print(f"    got {len(batch)} hourly obs")
                for row in batch:
                    all_rows.append({
                        "location": loc_name,
                        "datetime": row["period"]["datetimeFrom"]["utc"],
                        "value": row["value"],
                    })
                time.sleep(0.3)

    if not all_rows:
        print(f"  [!] No data returned for {city}")
        continue

    df = pd.DataFrame(all_rows)
    df["datetime"] = pd.to_datetime(df["datetime"])
    df["date"] = df["datetime"].dt.tz_convert("UTC").dt.date
    # daily mean across all locations for the city
    daily = df.groupby("date")["value"].mean().reset_index()
    daily.columns = ["date", "pm25"]
    out = f"{city}_pm25_openaq.csv"
    daily.to_csv(out, index=False)
    print(f"  Saved {out} ({len(daily)} days, "
          f"{daily['date'].min()} -> {daily['date'].max()})")

print("\nDone. Upload the three CSVs in the chat to continue.")

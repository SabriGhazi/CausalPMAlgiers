"""
Pull Algiers daily weather from Open-Meteo ERA5 archive.
Covers the full PM2.5 study period (2019-04-25 to 2025-03-04).

Requirements: requests (pip install requests)
Run: python fetch_openmeteo.py
Output: algiers_weather_openmeteo.csv

Open-Meteo is free, no API key required, ERA5-reanalysis backed.
Algiers coords: 36.7559, 3.0392 (from Ghazi et al. 2025, JST12 paper).
"""
import requests
import pandas as pd

URL = "https://archive-api.open-meteo.com/v1/archive"
params = {
    "latitude": 36.7559,
    "longitude": 3.0392,
    "start_date": "2019-04-25",
    "end_date": "2025-03-04",
    "daily": ",".join([
        "temperature_2m_mean",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "rain_sum",
        "windspeed_10m_max",
        "windgusts_10m_max",
        "shortwave_radiation_sum",
        "relative_humidity_2m_mean",
    ]),
    "timezone": "Africa/Algiers",
}

print("Fetching Algiers weather from Open-Meteo ERA5 archive...")
r = requests.get(URL, params=params, timeout=60)
r.raise_for_status()
data = r.json()

daily = data["daily"]
df = pd.DataFrame(daily)
df = df.rename(columns={"time": "date"})
df["date"] = pd.to_datetime(df["date"])
# Rename to match your existing column naming convention
df = df.rename(columns={
    "temperature_2m_mean": "Temperature",
    "precipitation_sum": "precipitation_sum",
    "windspeed_10m_max": "windspead",  # keeping your spelling
    "shortwave_radiation_sum": "shortwave_radiation",
})
print(f"Got {len(df)} daily records, {df['date'].min().date()} -> {df['date'].max().date()}")
print(df.head(3))
print(df.tail(3))

df.to_csv("algiers_weather_openmeteo.csv", index=False)
print("\nSaved: algiers_weather_openmeteo.csv")
print("Upload this file in the chat to continue the analysis.")

"use client";

import { useCallback, useEffect, useState } from "react";
import TextScramble from "./TextScramble";
import styles from "@/app/page.module.css";

const ASCII_SUN = `   \\   /
    .-.
 --(   )--
    '-'
   /   \\`;

const ASCII_CLOUD = `  .-.
 (   ).
(___(__)
 ‘ ‘ ‘ ‘`;

const ASCII_RAIN = `  .-.
 (   ).
(___(__)
 ‘ ‘ ‘ ‘
  ‘ ‘ ‘`;

const ASCII_SNOW = `  .-.
 (   ).
(___(__)
 *  *  *
*  *  *`;

const ASCII_STORM = `  .-.
 (   ).
(___(__)
 ⚡ ⚡ ⚡
  ‘ ‘ ‘`;

type WeatherData = {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  condition: string;
  conditionCode: number;
  location: { lat: number; lon: number };
  locationName: string;
};

type Status = "idle" | "locating" | "fetching" | "ready" | "error";

function getAsciiForCondition(code: number): string {
  // WMO Weather interpretation codes (WW)
  // 0: Clear sky
  // 1, 2, 3: Mainly clear, partly cloudy, and overcast
  // 45, 48: Fog and depositing rime fog
  // 51, 53, 55: Drizzle: Light, moderate, and dense intensity
  // 56, 57: Freezing Drizzle: Light and dense intensity
  // 61, 63, 65: Rain: Slight, moderate and heavy intensity
  // 66, 67: Freezing Rain: Light and heavy intensity
  // 71, 73, 75: Snow fall: Slight, moderate, and heavy intensity
  // 77: Snow grains
  // 80, 81, 82: Rain showers: Slight, moderate, and violent
  // 85, 86: Snow showers slight and heavy
  // 95: Thunderstorm: Slight or moderate
  // 96, 99: Thunderstorm with slight and heavy hail

  if (code === 0 || code === 1) return ASCII_SUN;
  if (code === 2 || code === 3 || code === 45 || code === 48) return ASCII_CLOUD;
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82)
  )
    return ASCII_RAIN;
  if (
    (code >= 71 && code <= 77) ||
    (code >= 85 && code <= 86)
  )
    return ASCII_SNOW;
  if (code >= 95) return ASCII_STORM;

  return ASCII_CLOUD; // Default
}

async function fetchWeather(lat: number, lon: number) {
  const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Weather fetch failed");
  return (await res.json()) as WeatherData;
}

function toCardinal(deg: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}

export default function WeatherCard() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WeatherData | null>(null);

  const loadWeather = useCallback(async () => {
    setStatus("locating");
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
          })
      );

      setStatus("fetching");
      const { latitude, longitude } = position.coords;
      const result = await fetchWeather(latitude, longitude);
      setData(result);
      setStatus("ready");
    } catch (err) {
      console.error(err);
      setError(
        "Could not fetch weather. Enable location or try again shortly."
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      void loadWeather();
    }, 0);
    return () => clearTimeout(id);
  }, [loadWeather]);

  return (
    <div className={styles.weatherCard}>
      <div className={styles.wxHeader}>
        <div>
          <div className={styles.wxLabel}>TARGET_SECTOR</div>
          <div className={styles.wxValue}>
            {status === "ready" && data
              ? data.locationName
              : status === "locating"
                ? "LOCATING..."
                : "ACQUIRING..."}
          </div>
        </div>
        <div className={styles.wxLabelRight}>
          <div className={styles.wxLabel}>COORDINATES</div>
          <div className={styles.wxLabel}>
            {status === "ready" && data
              ? `${data.location.lat.toFixed(2)}, ${data.location.lon.toFixed(2)}`
              : "--, --"}
          </div>
        </div>
      </div>

      <div className={styles.weatherLayout}>
        <div className={styles.wxTempBlock}>
          <div className={styles.wxLabel}>AMBIENT_TEMP</div>
          <div className={styles.wxTemp}>
            <TextScramble
              text={
                status === "ready" && data
                  ? `${Math.round(data.temp)}°C`
                  : status === "error"
                    ? "ERR"
                    : "--"
              }
              triggerKey={status}
            />
          </div>
          <div className={styles.wxLabel}>CONDITION</div>
          <div className={styles.wxCondition}>
            <TextScramble
              text={
                status === "ready" && data
                  ? data.condition.toUpperCase()
                  : status === "error"
                    ? error ?? "UNAVAILABLE"
                    : "LOADING"
              }
              triggerKey={status}
            />
          </div>
        </div>

        <div className={styles.wxAsciiBox}>
          <div className={styles.wxAsciiLabel}>IMG_01</div>
          <pre className={styles.wxAscii}>
            {status === "ready" && data
              ? getAsciiForCondition(data.conditionCode)
              : ASCII_CLOUD}
          </pre>
        </div>
      </div>

      <div className={styles.wxBottomRow}>
        <div className={styles.wxStat}>
          <div className={styles.wxLabel}>HUMIDITY</div>
          <div className={styles.wxStatValue}>
            {status === "ready" && data ? `${Math.round(data.humidity)}%` : "--"}
          </div>
        </div>
        <div className={styles.wxStat}>
          <div className={styles.wxLabel}>WIND</div>
          <div className={styles.wxStatValue}>
            {status === "ready" && data
              ? `${Math.round(data.windSpeed)} km/h ${toCardinal(data.windDirection)}`
              : "--"}
          </div>
        </div>
      </div>
    </div>
  );
}


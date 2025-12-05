"use client";

import { useCallback, useEffect, useState } from "react";
import TextScramble from "./TextScramble";
import styles from "@/app/page.module.css";

const ASCII_CLOUD = `  .-.
 (   ).
(___(__)
 ‘ ‘ ‘ ‘`;

type WeatherData = {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  condition: string;
  location: { lat: number; lon: number };
};

type Status = "idle" | "locating" | "fetching" | "ready" | "error";

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
    <div>
      <div className={styles.wxHeader}>
        <div>
          <div className={styles.wxLabel}>TARGET_COORDINATES</div>
          <div className={styles.wxValue}>
            {status === "ready" && data
              ? `LAT ${data.location.lat.toFixed(2)}, LON ${data.location.lon.toFixed(2)}`
              : "Acquiring..."}
          </div>
        </div>
        <div className={styles.wxLabelRight}>
          <div className={styles.wxLabel}>SECTOR: EARTH</div>
          <div className={styles.wxLabel}>MODE: ATMOSPHERIC</div>
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
                    : "----"
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
          <pre className={styles.wxAscii}>{ASCII_CLOUD}</pre>
        </div>
      </div>

      <div className={styles.wxBottomRow}>
        <div className={styles.wxStat}>
          <div className={styles.wxLabel}>HUMIDITY_LEVEL</div>
          <div className={styles.wxStatValue}>
            {status === "ready" && data ? `${Math.round(data.humidity)}%` : "--"}
          </div>
        </div>
        <div className={styles.wxStat}>
          <div className={styles.wxLabel}>WIND_VELOCITY</div>
          <div className={styles.wxStatValue}>
            {status === "ready" && data
              ? `${Math.round(data.windSpeed)} km/h ${toCardinal(data.windDirection)}`
              : "--"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button
          className={styles.button}
          onClick={() => {
            void loadWeather();
          }}
        >
          Refresh
        </button>
        <span className={styles.status}>
          {status === "ready" ? "live" : status === "error" ? "error" : status}
        </span>
      </div>
    </div>
  );
}


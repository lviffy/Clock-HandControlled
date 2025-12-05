"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TextScramble from "@/components/TextScramble";
import HandControl from "@/components/HandControl";
import WeatherCard from "@/components/WeatherCard";
import type { GestureEvent } from "@/lib/handLandmarker";
import styles from "./page.module.css";

type ViewMode = "clock" | "weather";
type ThemeMode = "dark" | "light";

const themes: Record<ThemeMode, Record<string, string>> = {
  dark: {
    "--bg": "#050505",
    "--bg-2": "#0a0c10",
    "--grid": "rgba(255, 255, 255, 0.03)",
    "--accent": "#5ac8ff",
    "--accent-strong": "#b8e6ff",
    "--text": "#d8f1ff",
    "--muted": "#7aa3c7",
    "--card": "rgba(4, 12, 24, 0.72)",
    "--border": "rgba(90, 200, 255, 0.5)",
    "--glow": "0 0 18px rgba(90, 200, 255, 0.55)",
    // New semantic vars
    "--card-bg": "rgba(8, 10, 14, 0.6)",
    "--card-solid": "rgba(8, 10, 14, 0.9)",
    "--shadow-card": "0 0 60px rgba(0, 0, 0, 0.6)",
    "--shadow-float": "0 0 20px rgba(0, 0, 0, 0.5)",
    "--border-dim": "rgba(90, 200, 255, 0.15)",
    "--text-shadow": "0 0 24px rgba(90, 200, 255, 0.2)",
  },
  light: {
    "--bg": "#f7f9fc",
    "--bg-2": "#ffffff",
    "--grid": "rgba(0, 50, 100, 0.15)",
    "--accent": "#0055ff",
    "--accent-strong": "#003399",
    "--text": "#0f172a",
    "--muted": "#64748b",
    "--card": "rgba(255, 255, 255, 0.75)",
    "--border": "rgba(0, 85, 255, 0.15)",
    "--glow": "0 4px 20px rgba(0, 85, 255, 0.1)",
    // New semantic vars
    "--card-bg": "rgba(255, 255, 255, 0.85)",
    "--card-solid": "rgba(255, 255, 255, 0.95)",
    "--shadow-card": "0 20px 50px rgba(0, 0, 0, 0.08)",
    "--shadow-float": "0 10px 30px rgba(0, 0, 0, 0.1)",
    "--border-dim": "rgba(0, 50, 100, 0.08)",
    "--text-shadow": "none",
  },
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour12: false });
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Home() {
  const [now, setNow] = useState(new Date());
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<ViewMode>("clock");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [brightness, setBrightness] = useState(1);
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [tiltBaseline, setTiltBaseline] = useState<number | null>(null);
  const [tiltSensitivity] = useState(0.08);
  const [lastGesture, setLastGesture] = useState<string>("--");
  const calibrationNonce = 0;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  const themeVars = useMemo(() => {
    return themes[theme];
  }, [theme]);

  // Apply theme variables to root
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(themeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [themeVars]);

  const handleGesture = useCallback((event: GestureEvent) => {
    setLastGesture(event.type.toUpperCase());
    if (event.type === "open-palm") {
      setView("clock");
    }
    if (event.type === "fist") {
      setView("weather");
    }
    if (event.type === "tilt-up") {
      setBrightness((b) => Math.min(1.6, +(b + 0.05).toFixed(2)));
    }
    if (event.type === "tilt-down") {
      setBrightness((b) => Math.max(0.6, +(b - 0.05).toFixed(2)));
    }
  }, []);

  const onCalibrate = useCallback((value: number) => {
    setTiltBaseline(value);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className={styles.page}>
      <div className={styles.floatingStatus}>
        <div className={styles.statusLabel}>INPUT_SENSOR_v1.1</div>
        <div className={styles.statusValue}>
          {cameraStatus === "scanning" ? "SCANNING..." : cameraStatus.toUpperCase()}
        </div>
        <div className={styles.protocolLine}>
          PROTOCOL: {lastGesture === "--" ? "WAITING" : lastGesture}
        </div>
        <button
          onClick={toggleTheme}
          style={{
            marginTop: "8px",
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--accent)",
            padding: "4px 8px",
            fontSize: "10px",
            cursor: "pointer",
            fontFamily: "var(--font-share-tech)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Theme: {theme.toUpperCase()}
        </button>
      </div>

      <div
        className={styles.shell}
        style={{ ...themeVars, filter: `brightness(${brightness})` }}
      >
        <div className={styles.centerFrame}>
          <div className={styles.frameOutline} />
          <div className={styles.cornerTopLeft} />
          <div className={styles.cornerTopRight} />
          <div className={styles.cornerBottomLeft} />
          <div className={styles.cornerBottomRight} />

          <div className={styles.contentCard}>
            {view === "clock" ? (
              <div className={styles.clock}>
                <div className={styles.systemLabel}>SYSTEM_TIME_REFERENCE</div>
                <div className={styles.timeRow}>
                  <span className={styles.time}>
                    {hydrated ? formatTime(now) : "--:--:--"}
                  </span>
                </div>
                <div className={styles.date}>
                  — {hydrated ? formatDate(now) : "----"} —
                </div>
              </div>
            ) : (
              <div className={styles.weatherCard}>
                <WeatherCard />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={styles.handVisualizer}>
        <div className={styles.visualizerLabel}>SENSOR_FEED</div>
        <HandControl
          tiltBaseline={tiltBaseline}
          tiltSensitivity={tiltSensitivity}
          calibrationNonce={calibrationNonce}
          onGesture={handleGesture}
          onCameraStatus={setCameraStatus}
          onTiltSample={onCalibrate}
        />
      </div>
    </div>
  );
}

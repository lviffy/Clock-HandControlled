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
    "--accent": "#5ac8ff",
    "--accent-strong": "#b8e6ff",
    "--text": "#d8f1ff",
    "--muted": "#7aa3c7",
    "--card": "rgba(4, 12, 24, 0.72)",
    "--border": "rgba(90, 200, 255, 0.5)",
    "--glow": "0 0 18px rgba(90, 200, 255, 0.55)",
  },
  light: {
    "--accent": "#4fa4ff",
    "--accent-strong": "#3a7bd9",
    "--text": "#0d213c",
    "--muted": "#3a5c8f",
    "--card": "rgba(233, 242, 255, 0.9)",
    "--border": "rgba(63, 126, 201, 0.4)",
    "--glow": "0 0 18px rgba(79, 164, 255, 0.35)",
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
  const [theme] = useState<ThemeMode>("dark");
  const [brightness, setBrightness] = useState(1);
  const [, setCameraStatus] = useState("idle");
  const [tiltBaseline, setTiltBaseline] = useState<number | null>(null);
  const [tiltSensitivity] = useState(0.08);
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

  const handleGesture = useCallback((event: GestureEvent) => {
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

  return (
    <div className={styles.page}>
      <div
        className={styles.shell}
        style={{ ...themeVars, filter: `brightness(${brightness})` }}
      >
        <div className={styles.centerFrame}>
          <div className={styles.frameOutline} />
          <div className={styles.header}>
            <div className={styles.title}>
              <TextScramble text="system.time.reference" triggerKey={view} />
            </div>
            <div className={styles.tag}>
              <TextScramble
                text={`${view === "clock" ? "CLOCK" : "WEATHER"} · ${theme.toUpperCase()}`}
                triggerKey={`${view}-${theme}`}
              />
            </div>
          </div>
          <div className={styles.contentCard}>
            {view === "clock" ? (
              <div className={styles.clock}>
                <div className={styles.timeRow}>
                  <span className={styles.time}>
                    {hydrated ? formatTime(now) : "--:--:--"}
                  </span>
                </div>
                <div className={styles.date}>
                  {hydrated ? formatDate(now) : "----"}
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
      <div className={styles.hiddenHand}>
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

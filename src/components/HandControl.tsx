"use client";

import { useEffect, useRef, useState } from "react";
import {
  classifyGesture,
  drawHands,
  getHandLandmarker,
  tiltMetric,
  type GestureEvent,
} from "@/lib/handLandmarker";

export type CameraStatus = "idle" | "scanning" | "error";

type Props = {
  tiltBaseline: number | null;
  tiltSensitivity: number;
  calibrationNonce: number;
  onGesture: (event: GestureEvent) => void;
  onCameraStatus: (status: CameraStatus) => void;
  onTiltSample?: (value: number) => void;
  onDebug?: (info: { opennessRatio?: number; tilt?: number }) => void;
};

const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  video: { width: 640, height: 480 },
  audio: false,
};

export default function HandControl({
  tiltBaseline,
  tiltSensitivity,
  calibrationNonce,
  onGesture,
  onCameraStatus,
  onTiltSample,
  onDebug,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>();
  const [landmarkerReady, setLandmarkerReady] = useState(false);
  const lastGestureTs = useRef(0);
  const pendingCalibration = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const baselineRef = useRef<number | null>(null);
  const sensitivityRef = useRef(0.08);
  const gestureCb = useRef(onGesture);
  const cameraCb = useRef(onCameraStatus);
  const tiltCb = useRef(onTiltSample);
  const debugCb = useRef(onDebug);
  const stableGesture = useRef<{ type: GestureEvent["type"]; count: number } | null>(
    null
  );

  useEffect(() => {
    baselineRef.current = tiltBaseline;
  }, [tiltBaseline]);

  useEffect(() => {
    sensitivityRef.current = tiltSensitivity;
  }, [tiltSensitivity]);

  useEffect(() => {
    gestureCb.current = onGesture;
  }, [onGesture]);

  useEffect(() => {
    cameraCb.current = onCameraStatus;
  }, [onCameraStatus]);

  useEffect(() => {
    tiltCb.current = onTiltSample;
  }, [onTiltSample]);

  useEffect(() => {
    debugCb.current = onDebug;
  }, [onDebug]);

  useEffect(() => {
    pendingCalibration.current = true;
  }, [calibrationNonce]);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const landmarker = await getHandLandmarker();
        if (cancelled) return;
        setLandmarkerReady(true);

        const mediaStream = await navigator.mediaDevices.getUserMedia(
          VIDEO_CONSTRAINTS
        );
        if (cancelled) return;

        const video = document.createElement("video");
        video.srcObject = mediaStream;
        video.playsInline = true;
        await video.play();
        cameraCb.current("scanning");
        streamRef.current = mediaStream;

        const loop = async () => {
          if (cancelled) return;
          const ctxCanvas = canvasRef.current;
          if (
            !ctxCanvas ||
            !video.videoWidth ||
            video.readyState < 2 ||
            video.paused ||
            video.currentTime === 0
          ) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }

          ctxCanvas.width = video.videoWidth;
          ctxCanvas.height = video.videoHeight;
          let result = null;
          try {
            result = landmarker.detectForVideo(video, performance.now());
          } catch (err) {
            console.warn("Hand detect failed, skipping frame", err);
          }

          drawHands(ctxCanvas, result);

          if (result?.landmarks.length) {
            if (pendingCalibration.current && tiltCb.current) {
              pendingCalibration.current = false;
              const tilt = tiltMetric(result.landmarks[0]);
              tiltCb.current(tilt);
            }

            const gesture = classifyGesture(
              result,
              baselineRef.current,
              sensitivityRef.current
            );
            if (gesture) {
              debugCb.current?.({
                opennessRatio: gesture.opennessRatio,
                tilt: tiltMetric(result.landmarks[0]),
              });
              const currentStable = stableGesture.current;
              if (currentStable?.type === gesture.type) {
                currentStable.count += 1;
              } else {
                stableGesture.current = { type: gesture.type, count: 1 };
              }

              const requiredFrames = gesture.type.startsWith("tilt")
                ? 2
                : gesture.type === "fist" || gesture.type === "open-palm"
                  ? 2
                  : 3;
              if ((stableGesture.current?.count ?? 0) >= requiredFrames) {
                const now = Date.now();
                const cooldown = gesture.type.startsWith("tilt") ? 220 : 850;
                if (now - lastGestureTs.current > cooldown) {
                  lastGestureTs.current = now;
                  gestureCb.current(gesture);
                  stableGesture.current = null;
                }
              }
            }
          }

          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        console.error(err);
        cameraCb.current("error");
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div>
      <canvas ref={canvasRef} style={{ width: "100%", borderRadius: 12 }} />
      {!landmarkerReady && (
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
          Loading hand model...
        </p>
      )}
    </div>
  );
}


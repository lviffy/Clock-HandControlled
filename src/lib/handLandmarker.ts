'use client';

import type {
  HandLandmarker,
  HandLandmarkerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";

export type GestureType = "open-palm" | "fist" | "tilt-up" | "tilt-down";

export type GestureEvent = {
  type: GestureType;
  tiltDelta?: number;
  opennessRatio?: number;
};

let handLandmarkerSingleton: HandLandmarker | null = null;

export async function getHandLandmarker() {
  if (handLandmarkerSingleton) return handLandmarkerSingleton;

  const vision = await import("@mediapipe/tasks-vision");
  const filesetResolver = await vision.FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  handLandmarkerSingleton = await vision.HandLandmarker.createFromOptions(
    filesetResolver,
    {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      },
      runningMode: "VIDEO",
      numHands: 1,
    }
  );

  return handLandmarkerSingleton;
}

function distance(a: NormalizedLandmark, b: NormalizedLandmark) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function tiltMetric(landmarks: NormalizedLandmark[]) {
  // Simple tilt metric using depth difference between wrist and palm center.
  const wrist = landmarks[0];
  const palm = landmarks[9]; // center-ish
  return wrist.z - palm.z;
}

export function classifyGesture(
  result: HandLandmarkerResult,
  baselineTilt: number | null,
  tiltSensitivity: number
): GestureEvent | null {
  if (!result.landmarks.length) return null;
  const points = result.landmarks[0];

  const palmSpan = distance(points[5], points[17]) + distance(points[0], points[9]);

  const openness =
    distance(points[5], points[17]) +
    distance(points[4], points[8]) +
    distance(points[0], points[9]);
  const opennessRatio = openness / Math.max(palmSpan, 0.0001);
  // Fist vs palm separation; loosened thresholds for more reliable fist detection.
  if (opennessRatio < 1.2) {
    return { type: "fist", opennessRatio };
  }
  if (opennessRatio > 1.35) {
    return { type: "open-palm", opennessRatio };
  }

  if (baselineTilt !== null) {
    const tilt = tiltMetric(points);
    const delta = tilt - baselineTilt;
    if (delta > tiltSensitivity) {
      return { type: "tilt-up", tiltDelta: delta, opennessRatio };
    }
    if (delta < -tiltSensitivity) {
      return { type: "tilt-down", tiltDelta: delta, opennessRatio };
    }
  }

  return null;
}

export function drawHands(
  canvas: HTMLCanvasElement,
  result: HandLandmarkerResult | null
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!result?.landmarks?.length) return;

  ctx.strokeStyle = "rgba(90, 200, 255, 0.6)";
  ctx.lineWidth = 2;
  ctx.fillStyle = "rgba(90, 200, 255, 0.85)";

  const points = result.landmarks[0];
  points.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, 2 * Math.PI);
    ctx.fill();
  });
}


export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampVector(x: number, y: number, maxLength: number): { x: number; y: number } {
  const length = Math.hypot(x, y);

  if (length <= maxLength || length === 0) {
    return { x, y };
  }

  const scale = maxLength / length;
  return {
    x: x * scale,
    y: y * scale
  };
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

import type { ScoreLabel } from "./types";

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 80) {
    return { color: "green", label: "Highly Recommended" };
  }
  if (score >= 60) {
    return { color: "yellow", label: "Potential" };
  }
  return { color: "red", label: "Not Recommended" };
}

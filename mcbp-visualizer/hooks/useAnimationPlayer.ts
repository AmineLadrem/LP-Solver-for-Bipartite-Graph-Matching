"use client";
import { useEffect, useRef, type Dispatch } from "react";
import type { AppState, AppAction } from "../lib/appState";

// Base interval in ms between steps at 1x speed
const BASE_INTERVAL_MS = 800;

export function useAnimationPlayer(
  state: AppState,
  dispatch: Dispatch<AppAction>
) {
  const { isPlaying, currentStepIndex, steps, speed, autoplayDisabled } = state;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!isPlaying || steps.length === 0) return;

    if (autoplayDisabled) {
      dispatch({ type: "SET_PLAYING", playing: false });
      return;
    }

    // Already at the end
    if (currentStepIndex >= steps.length - 1) {
      dispatch({ type: "SET_PLAYING", playing: false });
      return;
    }

    const interval = BASE_INTERVAL_MS / speed;
    timeoutRef.current = setTimeout(() => {
      dispatch({ type: "NEXT_STEP" });
    }, interval);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [autoplayDisabled, isPlaying, currentStepIndex, steps.length, speed, dispatch]);
}

"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";
import { AlgorithmPanel } from "@/components/AlgorithmPanel/AlgorithmPanel";
import { ControlsPanel } from "@/components/ControlsPanel";
import { Header } from "@/components/Header";
import { Visualization } from "@/components/Visualization";
import { useAnimationPlayer } from "@/hooks/useAnimationPlayer";
import { appReducer, initialState, isLPAlgorithm } from "@/lib/appState";
import { runHopcroftKarp } from "@/lib/algorithms/hopcroftKarp";
import { LP_EDGE_LIMIT, LP_VERTEX_LIMIT, LP_SOLVER_LABELS, runLP } from "@/lib/algorithms/lp";
import type { AlgorithmName, AlgorithmResult, LPSolverMode, RunValidation, Step } from "@/lib/types";

const ALGORITHM_LABELS: Record<AlgorithmName, string> = {
  hopcroftKarp: "Hopcroft-Karp",
  ...LP_SOLVER_LABELS,
};

function validateRun(algorithm: AlgorithmName, vertexCount: number, edgeCount: number): RunValidation {
  if (isLPAlgorithm(algorithm) && (edgeCount > LP_EDGE_LIMIT || vertexCount > LP_VERTEX_LIMIT)) {
    return {
      allowed: false,
      reason: `LP demo is limited to at most ${LP_EDGE_LIMIT} edges and ${LP_VERTEX_LIMIT} vertices. Current graph: ${vertexCount} vertices, ${edgeCount} edges. Reduce density or graph size to run the LP view.`,
    };
  }
  return { allowed: true };
}

export function VisualizerApp() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  useAnimationPlayer(state, dispatch);

  const currentStep = state.steps[state.currentStepIndex] ?? null;
  const validation = useMemo(
    () => validateRun(state.algorithm, state.graph.vertices.length, state.graph.edges.length),
    [state.algorithm, state.graph.edges.length, state.graph.vertices.length]
  );
  const runDisabledReason = validation.allowed ? null : validation.reason ?? "Run unavailable.";

  const makeSteps = useCallback((): Step[] | null => {
    const nextValidation = validateRun(
      state.algorithm,
      state.graph.vertices.length,
      state.graph.edges.length
    );
    if (!nextValidation.allowed) {
      dispatch({
        type: "CLEAR_STEPS",
        message: "Algorithm run blocked by the current graph size.",
        warning: nextValidation.reason,
      });
      return null;
    }

    let steps: Step[];
    if (state.algorithm === "hopcroftKarp") {
      steps = runHopcroftKarp(state.graph);
    } else {
      steps = runLP(state.graph, state.algorithm as LPSolverMode);
    }

    dispatch({
      type: "SET_STEPS",
      steps,
      message: `Generated ${steps.length} steps for ${ALGORITHM_LABELS[state.algorithm]}. Press Play or Step Forward.`,
    });
    return steps;
  }, [state.algorithm, state.graph]);

  const ensureSteps = useCallback(() => {
    return state.steps.length > 0 ? state.steps : makeSteps();
  }, [makeSteps, state.steps]);

  const addResultForStep = useCallback(
    (step: Step, steps: Step[]) => {
      if (!step.isComplete) return;

      const matchingSize = step.matchedEdgeIds.length;
      const result: AlgorithmResult = {
        algorithm: step.algorithm,
        matchingSize,
        stepsTaken: steps.length,
        optimal:
          step.algorithm === "hopcroftKarp" || isLPAlgorithm(step.algorithm)
            ? true
            : "unknown",
      };

      const existing = state.results.find((item) => item.algorithm === result.algorithm);
      if (
        existing?.matchingSize === result.matchingSize &&
        existing.stepsTaken === result.stepsTaken &&
        existing.optimal === result.optimal
      ) {
        return;
      }

      dispatch({ type: "ADD_RESULT", result });
    },
    [state.graph, state.results]
  );

  useEffect(() => {
    if (currentStep?.isComplete) addResultForStep(currentStep, state.steps);
  }, [addResultForStep, currentStep, state.steps]);

  const handleRunAlgorithm = useCallback(() => {
    makeSteps();
  }, [makeSteps]);

  const handlePlay = useCallback(() => {
    const steps = ensureSteps();
    if (!steps || steps.length === 0) return;
    if (state.currentStepIndex >= steps.length - 1) {
      dispatch({
        type: "SET_MESSAGE",
        message: "Already at the final step. Press Reset to replay from the start.",
      });
      return;
    }
    if (steps.length > 1200) {
      dispatch({
        type: "SET_MESSAGE",
        message: "Use Step Forward or Skip to End for this run.",
        warning: "Large step list. Autoplay disabled to keep the page responsive.",
      });
      return;
    }
    dispatch({ type: "SET_PLAYING", playing: true });
  }, [ensureSteps, state.currentStepIndex]);

  const handleStepForward = useCallback(() => {
    const steps = ensureSteps();
    if (!steps || steps.length === 0) return;
    const nextIndex = Math.min(state.currentStepIndex + 1, steps.length - 1);
    dispatch({ type: "SET_STEP_INDEX", index: nextIndex });
    if (steps[nextIndex]?.isComplete) addResultForStep(steps[nextIndex], steps);
  }, [addResultForStep, ensureSteps, state.currentStepIndex]);

  const handleSkipToEnd = useCallback(() => {
    const steps = ensureSteps();
    if (!steps || steps.length === 0) return;
    dispatch({ type: "SKIP_TO_END" });
    const finalStep = steps[steps.length - 1];
    if (finalStep) addResultForStep(finalStep, steps);
  }, [addResultForStep, ensureSteps]);

  const fallbackMessage =
    state.steps.length === 0
      ? "Run an algorithm to generate playback steps."
      : state.statusMessage;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-text-primary">
      <Header />
      <main className="flex min-h-0 flex-1 overflow-hidden lg:flex-row">
        <ControlsPanel
          state={state}
          dispatch={dispatch}
          onRunAlgorithm={handleRunAlgorithm}
          onPlay={handlePlay}
          onStepForward={handleStepForward}
          onSkipToEnd={handleSkipToEnd}
          runDisabledReason={runDisabledReason}
        />
        <section className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="grid h-full min-h-0 min-w-0 flex-1 auto-rows-fr grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-h-0 overflow-hidden border-b border-border bg-background lg:border-b-0 lg:border-r">
              <Visualization graph={state.graph} currentStep={currentStep} />
            </div>
            <div className="flex min-h-0 flex-col overflow-y-auto">
              <AlgorithmPanel
                algorithm={state.algorithm}
                graph={state.graph}
                currentStep={currentStep}
                statusMessage={state.statusMessage}
                warningMessage={state.warningMessage}
                stepMessage={currentStep?.description ?? fallbackMessage}
                restrictionMessage={runDisabledReason}
                results={state.results}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

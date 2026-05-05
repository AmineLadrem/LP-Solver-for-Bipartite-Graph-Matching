import { generateGraph, type BipartiteGraph } from "./graph";
import type { AlgorithmName, AlgorithmResult, Step } from "./types";

export interface GraphParams {
  uSize: number;
  wSize: number;
  density: number;
  seed: number;
}

export interface AppState {
  graph: BipartiteGraph;
  graphParams: GraphParams;
  algorithm: AlgorithmName;
  steps: Step[];
  currentStepIndex: number;
  isPlaying: boolean;
  speed: number;
  results: AlgorithmResult[];
  statusMessage: string;
  warningMessage: string | null;
  autoplayDisabled: boolean;
}

export type AppAction =
  | { type: "SET_GRAPH_PARAMS"; params: Partial<GraphParams> }
  | { type: "SET_ALGORITHM"; algorithm: AlgorithmName }
  | { type: "SET_STEPS"; steps: Step[]; message?: string; warning?: string | null }
  | { type: "CLEAR_STEPS"; message: string; warning?: string | null }
  | { type: "SET_STEP_INDEX"; index: number }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SET_PLAYING"; playing: boolean }
  | { type: "SET_SPEED"; speed: number }
  | { type: "RESET" }
  | { type: "SKIP_TO_END" }
  | { type: "ADD_RESULT"; result: AlgorithmResult }
  | { type: "SET_MESSAGE"; message: string; warning?: string | null }
  | { type: "REGENERATE"; seed: number };

const DEFAULT_PARAMS: GraphParams = {
  uSize: 6,
  wSize: 6,
  density: 0.4,
  seed: 42,
};

const LARGE_STEP_WARNING =
  "Large step list. Autoplay disabled to keep the page responsive.";

function makeInitialState(): AppState {
  const graphParams = DEFAULT_PARAMS;
  return {
    graph: generateGraph(
      graphParams.uSize,
      graphParams.wSize,
      graphParams.density,
      graphParams.seed
    ),
    graphParams,
    algorithm: "greedy",
    steps: [],
    currentStepIndex: 0,
    isPlaying: false,
    speed: 1,
    results: [],
    statusMessage: "Graph ready. Run an algorithm to generate playback steps.",
    warningMessage: null,
    autoplayDisabled: false,
  };
}

export const initialState: AppState = makeInitialState();

function resetForGraph(state: AppState, graphParams: GraphParams): AppState {
  return {
    ...state,
    graphParams,
    graph: generateGraph(
      graphParams.uSize,
      graphParams.wSize,
      graphParams.density,
      graphParams.seed
    ),
    steps: [],
    currentStepIndex: 0,
    isPlaying: false,
    results: [],
    statusMessage: "Graph regenerated. Run an algorithm to generate playback steps.",
    warningMessage: null,
    autoplayDisabled: false,
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_GRAPH_PARAMS":
      return resetForGraph(state, { ...state.graphParams, ...action.params });
    case "REGENERATE":
      return resetForGraph(state, {
        ...state.graphParams,
        seed: action.seed,
      });
    case "SET_ALGORITHM":
      return {
        ...state,
        algorithm: action.algorithm,
        steps: [],
        currentStepIndex: 0,
        isPlaying: false,
        statusMessage: "Algorithm changed. Run it to generate playback steps.",
        warningMessage: null,
        autoplayDisabled: false,
      };
    case "SET_STEPS": {
      const autoplayDisabled = action.steps.length > 1200;
      return {
        ...state,
        steps: action.steps,
        currentStepIndex: 0,
        isPlaying: false,
        statusMessage:
          action.message ??
          `Generated ${action.steps.length} steps. Press Play or Step Forward.`,
        warningMessage:
          action.warning ?? (autoplayDisabled ? LARGE_STEP_WARNING : null),
        autoplayDisabled,
      };
    }
    case "CLEAR_STEPS":
      return {
        ...state,
        steps: [],
        currentStepIndex: 0,
        isPlaying: false,
        statusMessage: action.message,
        warningMessage: action.warning ?? null,
        autoplayDisabled: false,
      };
    case "SET_STEP_INDEX":
      return {
        ...state,
        currentStepIndex: Math.max(0, Math.min(action.index, state.steps.length - 1)),
      };
    case "NEXT_STEP":
      if (state.steps.length === 0) return state;
      if (state.currentStepIndex >= state.steps.length - 1) {
        return { ...state, isPlaying: false };
      }
      return { ...state, currentStepIndex: state.currentStepIndex + 1 };
    case "PREV_STEP":
      return {
        ...state,
        currentStepIndex: Math.max(0, state.currentStepIndex - 1),
        isPlaying: false,
      };
    case "SET_PLAYING":
      return { ...state, isPlaying: action.playing };
    case "SET_SPEED":
      return { ...state, speed: action.speed };
    case "RESET":
      return {
        ...state,
        currentStepIndex: 0,
        isPlaying: false,
        statusMessage:
          state.steps.length > 0
            ? "Playback reset to the first step."
            : state.statusMessage,
      };
    case "SKIP_TO_END":
      return {
        ...state,
        currentStepIndex: Math.max(0, state.steps.length - 1),
        isPlaying: false,
        statusMessage:
          state.steps.length > 0 ? "Skipped to the completed state." : state.statusMessage,
      };
    case "ADD_RESULT":
      return {
        ...state,
        results: [
          ...state.results.filter((result) => result.algorithm !== action.result.algorithm),
          action.result,
        ],
      };
    case "SET_MESSAGE":
      return {
        ...state,
        statusMessage: action.message,
        warningMessage: action.warning ?? null,
      };
    default:
      return state;
  }
}

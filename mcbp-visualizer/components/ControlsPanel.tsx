"use client";

import type { Dispatch } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { AppAction, AppState } from "@/lib/appState";
import { LP_SOLVER_LABELS, LP_SOLVER_DESCRIPTIONS } from "@/lib/algorithms/lp";
import type { AlgorithmName, LPSolverMode } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  onRunAlgorithm: () => void;
  onPlay: () => void;
  onStepForward: () => void;
  onSkipToEnd: () => void;
  runDisabledReason?: string | null;
}

const LP_ALGORITHMS: { name: LPSolverMode; label: string; description: string }[] = (
  Object.entries(LP_SOLVER_LABELS) as [LPSolverMode, string][]
).map(([name, label]) => ({ name, label, description: LP_SOLVER_DESCRIPTIONS[name] }));

function randomSeed(currentSeed: number) {
  const next = Math.floor(Math.random() * 1_000_000);
  return next === currentSeed ? (next + 1) % 1_000_000 : next;
}

export function ControlsPanel({
  state,
  dispatch,
  onRunAlgorithm,
  onPlay,
  onStepForward,
  onSkipToEnd,
  runDisabledReason,
}: Props) {
  const { graphParams, algorithm, isPlaying, currentStepIndex, steps, speed } = state;
  const hasSteps = steps.length > 0;
  const atStart = currentStepIndex <= 0;
  const atEnd = hasSteps && currentStepIndex >= steps.length - 1;
  const runDisabled = Boolean(runDisabledReason);

  return (
    <div className="flex w-full shrink-0 flex-col gap-5 overflow-y-auto border-b border-border bg-surface p-5 lg:h-full lg:w-64 lg:border-b-0 lg:border-r">
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Graph
        </h2>
        <div className="flex flex-col gap-4">
          <Slider
            label="|U| — left vertices"
            displayValue={String(graphParams.uSize)}
            min={2}
            max={30}
            step={1}
            value={[graphParams.uSize]}
            onValueChange={([v]) =>
              dispatch({ type: "SET_GRAPH_PARAMS", params: { uSize: v } })
            }
          />
          <Slider
            label="|W| — right vertices"
            displayValue={String(graphParams.wSize)}
            min={2}
            max={30}
            step={1}
            value={[graphParams.wSize]}
            onValueChange={([v]) =>
              dispatch({ type: "SET_GRAPH_PARAMS", params: { wSize: v } })
            }
          />
          <Slider
            label="Density d = |E| / (|U||W|)"
            displayValue={graphParams.density.toFixed(2)}
            min={0.05}
            max={1}
            step={0.05}
            value={[graphParams.density]}
            onValueChange={([v]) =>
              dispatch({ type: "SET_GRAPH_PARAMS", params: { density: v } })
            }
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-secondary" htmlFor="graph-seed">
              Random seed
            </label>
            <div className="flex gap-2">
              <input
                id="graph-seed"
                type="number"
                value={graphParams.seed}
                onChange={(e) =>
                  dispatch({
                    type: "SET_GRAPH_PARAMS",
                    params: { seed: Number.parseInt(e.target.value, 10) || 0 },
                  })
                }
                className="h-8 min-w-0 flex-1 rounded border border-border bg-surface-raised px-3 font-mono text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  dispatch({ type: "REGENERATE", seed: randomSeed(graphParams.seed) })
                }
                aria-label="Regenerate graph with random seed"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          LP solver models
        </h2>
        <div className="mt-2 flex flex-col gap-1.5">
          {LP_ALGORITHMS.map(({ name, label, description }) => (
            <AlgButton
              key={name}
              name={name}
              label={label}
              tooltip={description}
              active={algorithm === name}
              onSelect={() => dispatch({ type: "SET_ALGORITHM", algorithm: name })}
            />
          ))}
        </div>
      </section>

      <Button
        variant="accent"
        size="lg"
        className="w-full"
        onClick={onRunAlgorithm}
        disabled={runDisabled}
      >
        Run Algorithm
      </Button>
      {runDisabledReason && (
        <p className="text-xs leading-relaxed text-text-secondary">{runDisabledReason}</p>
      )}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Playback
        </h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={!hasSteps || atStart}
              onClick={() => dispatch({ type: "RESET" })}
              aria-label="Reset"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!hasSteps || atStart}
              onClick={() => dispatch({ type: "PREV_STEP" })}
              aria-label="Step back"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={isPlaying ? "default" : "accent"}
              size="icon"
              disabled={atEnd && hasSteps}
              onClick={() =>
                isPlaying ? dispatch({ type: "SET_PLAYING", playing: false }) : onPlay()
              }
              aria-label={isPlaying ? "Pause" : "Play"}
              className="h-10 w-10"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={hasSteps && atEnd}
              onClick={onStepForward}
              aria-label="Step forward"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={hasSteps && atEnd}
              onClick={onSkipToEnd}
              aria-label="Skip to end"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Slider
            label="Speed"
            displayValue={`${speed.toFixed(1)}x`}
            min={0.5}
            max={4}
            step={0.5}
            value={[speed]}
            onValueChange={([v]) => dispatch({ type: "SET_SPEED", speed: v })}
          />

          {hasSteps ? (
            <div className="font-mono text-xs text-text-secondary">
              Step {Math.max(1, currentStepIndex + 1)} / {steps.length}
            </div>
          ) : (
            <div className="text-xs text-text-secondary">
              Run an algorithm, then use Play or Step Forward.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function AlgButton({
  name,
  label,
  tooltip,
  active,
  onSelect,
}: {
  name: AlgorithmName;
  label: string;
  tooltip?: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      key={name}
      type="button"
      onClick={onSelect}
      title={tooltip}
      className={cn(
        "h-8 rounded px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
        active
          ? "bg-accent font-semibold text-background"
          : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
      )}
    >
      {label}
    </button>
  );
}

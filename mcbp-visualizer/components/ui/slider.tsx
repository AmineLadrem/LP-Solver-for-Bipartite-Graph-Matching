"use client";
import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  label?: string;
  displayValue?: string;
}

export function Slider({ className, label, displayValue, ...props }: SliderProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-text-secondary">{label}</span>
          {displayValue && (
            <span className="text-xs font-mono text-text-primary">{displayValue}</span>
          )}
        </div>
      )}
      <SliderPrimitive.Root
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className
        )}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-surface-raised border border-border">
          <SliderPrimitive.Range className="absolute h-full bg-accent" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-accent bg-background ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent hover:scale-110 cursor-grab active:cursor-grabbing" />
      </SliderPrimitive.Root>
    </div>
  );
}

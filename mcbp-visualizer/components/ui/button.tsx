"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "accent";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40",
          {
            "bg-surface-raised text-text-primary border border-border hover:bg-[#2a2a30]":
              variant === "default",
            "border border-border bg-transparent text-text-primary hover:bg-surface-raised":
              variant === "outline",
            "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-raised":
              variant === "ghost",
            "bg-accent text-background hover:bg-[#00b8d9] font-semibold":
              variant === "accent",
          },
          {
            "h-7 px-3 text-xs rounded": size === "sm",
            "h-9 px-4 text-sm rounded-md": size === "md",
            "h-10 px-5 text-sm rounded-md": size === "lg",
            "h-8 w-8 rounded-md": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

"use client";

import { useState } from "react";

interface TooltipProps {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
  size?: "sm" | "md" | "lg";
}

function positionClasses(pos: NonNullable<TooltipProps["position"]>) {
  switch (pos) {
    case "bottom":
      return "top-full mt-2 left-1/2 -translate-x-1/2";
    case "left":
      return "right-full mr-2 top-1/2 -translate-y-1/2";
    case "right":
      return "left-full ml-2 top-1/2 -translate-y-1/2";
    default:
      return "bottom-full mb-2 left-1/2 -translate-x-1/2";
  }
}

export default function Tooltip({
  text,
  position = "top",
  size = "md",
}: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        className={`flex items-center justify-center rounded-full bg-gray-200 text-gray-600 cursor-help hover:bg-black hover:text-white transition-colors select-none ${
          size === "sm" ? "w-4 h-4 text-[10px]" : "w-5 h-5 text-xs"
        }`}
      >
        ?
      </span>
      {open && (
        <span className="z-50" role="tooltip">
          <span
            className={`absolute w-64 p-3 rounded-lg bg-white border border-gray-200 text-xs leading-relaxed text-gray-700 shadow-xl ${
              position === "bottom"
                ? "top-full mt-3 left-1/2 -translate-x-1/2"
                : position === "left"
                  ? "right-full mr-3 top-1/2 -translate-y-1/2"
                  : position === "right"
                    ? "left-full ml-3 top-1/2 -translate-y-1/2"
                    : "bottom-full mb-3 left-1/2 -translate-x-1/2"
            }`}
          >
            {text}
          </span>
        </span>
      )}
    </span>
  );
}
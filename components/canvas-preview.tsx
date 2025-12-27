"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CanvasPreviewProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  layoutError: string | null;
  onDismissError: () => void;
}

export function CanvasPreview({
  canvasRef,
  layoutError,
  onDismissError,
}: CanvasPreviewProps) {
  return (
    <div className="flex-1 relative min-h-0 flex flex-col">
      {layoutError && (
        <div className="absolute top-4 left-4 right-4 z-50 bg-destructive/10 text-destructive border border-destructive/20 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{layoutError}</span>
          <Button variant="ghost" size="icon" className="h-4 w-4 hover:bg-destructive/20" onClick={onDismissError}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Canvas Container */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[url('/grid-pattern.svg')] dark:bg-[url('/grid-pattern-dark.svg')] bg-center">
        <div className="relative shadow-2xl rounded-lg overflow-hidden ring-1 ring-black/5 dark:ring-white/10 bg-zinc-950 max-w-full">
          <canvas
            ref={canvasRef}
            className="block max-w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}


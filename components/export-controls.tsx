"use client";

import { Download, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ExportControlsProps {
  stepCount: number;
  totalMs: number;
  transitionMs: number;
  onTransitionMsChange: (value: number) => void;
  downloadUrl: string | null;
  isExporting: boolean;
  exportProgress: number;
  onExport: () => void;
  canExport: boolean;
}

export function ExportControls({
  stepCount,
  totalMs,
  transitionMs,
  onTransitionMsChange,
  downloadUrl,
  isExporting,
  exportProgress,
  onExport,
  canExport,
}: ExportControlsProps) {
  return (
    <div className="flex-none p-4 flex items-center justify-between gap-4 bg-muted/20 border-t">
      <div className="flex items-center gap-4">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">{stepCount}</span> steps · <span className="font-medium">{(totalMs / 1000).toFixed(1)}s</span> duration
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-xs whitespace-nowrap">Transition: {transitionMs}ms</Label>
          <Slider
            value={[transitionMs]}
            min={100}
            max={5000}
            step={100}
            onValueChange={([v]) => onTransitionMsChange(v)}
            className="w-[200px]"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {downloadUrl && (
          <Button variant="outline" size="sm" asChild className="gap-2">
            <a href={downloadUrl} download="magic-move.webm">
              <Film className="w-4 h-4" />
              Save Video
            </a>
          </Button>
        )}
        <Button
          size="sm"
          className={cn("gap-2 min-w-[120px]", isExporting && "opacity-80")}
          onClick={onExport}
          disabled={!canExport || isExporting}
        >
          <Download className="w-4 h-4" />
          {isExporting ? `Processing ${Math.round(exportProgress * 100)}%` : "Export"}
        </Button>
      </div>
    </div>
  );
}


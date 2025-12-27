"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

interface SettingsPopoverProps {
  showLineNumbers: boolean;
  onShowLineNumbersChange: (checked: boolean) => void;
  startLine: number;
  onStartLineChange: (value: number) => void;
  fps: number;
  onFpsChange: (value: number) => void;
}

export function SettingsPopover({
  showLineNumbers,
  onShowLineNumbersChange,
  startLine,
  onStartLineChange,
  fps,
  onFpsChange,
}: SettingsPopoverProps) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium leading-none">Configuration</h4>
      <p className="text-sm text-muted-foreground">Adjust rendering settings.</p>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="line-numbers">Line Numbers</Label>
          <Switch
            id="line-numbers"
            checked={showLineNumbers}
            onCheckedChange={onShowLineNumbersChange}
          />
        </div>
        {showLineNumbers && (
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="start-line" className="text-xs">Start Line</Label>
            <Input
              id="start-line"
              type="number"
              className="h-8 w-20 text-right"
              min={1}
              value={startLine}
              onChange={(e) => onStartLineChange(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <Label>FPS: {fps}</Label>
        <Slider
          value={[fps]}
          min={10}
          max={60}
          step={5}
          onValueChange={([v]) => onFpsChange(v)}
        />
      </div>
    </div>
  );
}


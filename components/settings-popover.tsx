"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldLabel } from "@/components/ui/field";
import { MinusIcon, PlusIcon } from "lucide-react";

interface SettingsPopoverProps {
  showLineNumbers: boolean;
  onShowLineNumbersChange: (checked: boolean) => void;
  startLine: number;
  onStartLineChange: (value: number) => void;
  fps: number;
  onFpsChange: (value: number) => void;
  startHoldMs: number;
  onStartHoldMsChange: (value: number) => void;
  betweenHoldMs: number;
  onBetweenHoldMsChange: (value: number) => void;
  endHoldMs: number;
  onEndHoldMsChange: (value: number) => void;
}

export function SettingsPopover({
  showLineNumbers,
  onShowLineNumbersChange,
  startLine,
  onStartLineChange,
  fps,
  onFpsChange,
  startHoldMs,
  onStartHoldMsChange,
  betweenHoldMs,
  onBetweenHoldMsChange,
  endHoldMs,
  onEndHoldMsChange,
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
          <Field orientation="horizontal">
            <FieldLabel htmlFor="number-of-gpus-f6l">Start Line</FieldLabel>
            <ButtonGroup>
              <Input
                id="number-of-gpus-f6l"
                value={startLine}
                onChange={(e) => onStartLineChange(Number(e.target.value))}
                size={3}
                className="h-8 !w-14 font-mono"
                maxLength={3}
              />
              <Button
                variant="outline"
                size="icon-sm"
                type="button"
                aria-label="Decrement"
                onClick={() => onStartLineChange(startLine - 1)}
                disabled={startLine <= 1}
              >
                <MinusIcon />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                type="button"
                aria-label="Increment"
                onClick={() => onStartLineChange(startLine + 1)}
                disabled={startLine >= 999}
              >
                <PlusIcon />
              </Button>
            </ButtonGroup>
          </Field>
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

      <Separator />

      <div className="space-y-4 pt-1">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timing (ms)</Label>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-xs">Start Rest: {startHoldMs}ms</Label>
            </div>
            <Slider
              value={[startHoldMs]}
              min={0}
              max={2000}
              step={50}
              onValueChange={([v]) => onStartHoldMsChange(v)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">Between Rest: {betweenHoldMs}ms</Label>
            </div>
            <Slider
              value={[betweenHoldMs]}
              min={0}
              max={2000}
              step={50}
              onValueChange={([v]) => onBetweenHoldMsChange(v)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">End Rest: {endHoldMs}ms</Label>
            </div>
            <Slider
              value={[endHoldMs]}
              min={0}
              max={2000}
              step={50}
              onValueChange={([v]) => onEndHoldMsChange(v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


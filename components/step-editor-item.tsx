"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface StepEditorItemProps {
  index: number;
  code: string;
  onCodeChange: (code: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function StepEditorItem({
  index,
  code,
  onCodeChange,
  onRemove,
  canRemove,
}: StepEditorItemProps) {
  return (
    <div className="group relative">
      {/* Step Header */}
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs font-mono text-muted-foreground">
          Step {index + 1}
        </Label>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Simplified Step Card/Textarea */}
      <div className="relative">
        <Textarea
          className="min-h-[250px] font-mono text-sm leading-relaxed p-4 resize-y bg-background focus-visible:ring-primary/20"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          spellCheck={false}
          placeholder={`// Enter code for step ${index + 1}...`}
        />
      </div>
    </div>
  );
}


"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StepInsertDividerProps {
  onInsert: () => void;
}

export function StepInsertDivider({ onInsert }: StepInsertDividerProps) {
  return (
    <div className="group/divider relative flex items-center justify-center py-1">
      <div className="absolute inset-x-0 top-1/2 h-px bg-border opacity-0 group-hover/divider:opacity-100 group-focus-within/divider:opacity-100 transition-opacity duration-200" />
      <Button
        variant="default"
        size="icon"
        className="h-6 w-6 rounded-full opacity-0 group-hover/divider:opacity-100 focus:opacity-100 transition-opacity duration-200 z-10"
        onClick={onInsert}
      >
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  );
}

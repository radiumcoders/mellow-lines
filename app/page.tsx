"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { animateLayouts } from "./lib/magicMove/animate"
import { drawCodeFrame } from "./lib/magicMove/canvasRenderer"
import { calculateCanvasHeight, layoutTokenLinesToCanvas, makeDefaultLayoutConfig } from "./lib/magicMove/codeLayout"
import type { LayoutResult } from "./lib/magicMove/codeLayout"
import { parseMagicMove } from "./lib/magicMove/parseMagicMove"
import { AVAILABLE_LANGUAGES, AVAILABLE_THEMES, getThemeVariant, shikiTokenizeToLines, type ShikiThemeChoice } from "./lib/magicMove/shikiHighlighter"
import type { MagicMoveStep, SimpleStep, UIMode } from "./lib/magicMove/types"
import { recordCanvasToWebm } from "./lib/video/recordCanvas"

type StepLayout = {
  layout: LayoutResult;
  tokenLineCount: number;
  startLine: number;
  showLineNumbers: boolean;
};

export default function Home() {

  const defaultInput = useMemo(
    () => `---
transition: slide-left
---

# Refactoring UI State
Moving from \`useState\` to \`useReducer\` for better predictability.

\`\`\`\`shiki-magic-move {lines:true}
\`\`\`ts {*|*}
// Step 1: Simple boolean state
import { useState } from 'react';

export function AuthButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsLoggedIn(true);
    setIsLoading(false);
  };

  return (
    <button onClick={handleLogin}>
      {isLoading ? 'Connecting...' : isLoggedIn ? 'Logout' : 'Login'}
    </button>
  );
}
\`\`\`

\`\`\`ts {*|*}
// Step 2: Encapsulated Reducer Logic
import { useReducer } from 'react';

type State = { status: 'idle' | 'loading' | 'authenticated' };
type Action = { type: 'LOGIN_START' } | { type: 'LOGIN_SUCCESS' };

function authReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOGIN_START': return { status: 'loading' };
    case 'LOGIN_SUCCESS': return { status: 'authenticated' };
    default: return state;
  }
}

export function AuthButton() {
  const [state, dispatch] = useReducer(authReducer, { status: 'idle' });

  const handleLogin = async () => {
    dispatch({ type: 'LOGIN_START' });
    await new Promise(r => setTimeout(r, 1000));
    dispatch({ type: 'LOGIN_SUCCESS' });
  };

  return (
    <button onClick={handleLogin} disabled={state.status === 'loading'}>
      {state.status === 'loading' ? 'Connecting...' :
       state.status === 'authenticated' ? 'Logout' : 'Login'}
    </button>
  );
}
\`\`\`
\`\`\`\`

---
transition: fade
---

# Database Normalization
Evolving a \"Tags\" system from JSONB to a Junction Table.

\`\`\`\`shiki-magic-move {lines:true}
\`\`\`sql {*|*}
-- Step 1: The \"Quick Start\" approach
-- Hard to query specific tags efficiently at scale.

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{\"tags\": []}'
);

-- Querying requires JSON path operators
SELECT * FROM posts
WHERE metadata->'tags' ? 'postgres';
\`\`\`

\`\`\`sql {*|*}
-- Step 2: Normalized Schema
-- Better data integrity and indexing.

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT
);

CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE posts_tags (
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Querying uses standard, performant JOINs
SELECT p.* FROM posts p
JOIN posts_tags pt ON p.id = pt.post_id
JOIN tags t ON pt.tag_id = t.id
WHERE t.name = 'postgres';
\`\`\`
\`\`\`\`
`.trim(),
    []
  );

  const [input, setInput] = useState<string>(defaultInput);
  const [theme, setTheme] = useState<ShikiThemeChoice>("github-dark");
  const [fps, setFps] = useState<number>(30);
  const [transitionMs, setTransitionMs] = useState<number>(800);
  const [forceLineNumbers, setForceLineNumbers] = useState<boolean>(false);

  // Simple mode state
  const [mode, setMode] = useState<UIMode>("simple");
  const [simpleSteps, setSimpleSteps] = useState<SimpleStep[]>([
    {
      code: `// Step 1: Simple boolean state
import { useState } from 'react';

export function AuthButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsLoggedIn(true);
    setIsLoading(false);
  };

  return (
    <button onClick={handleLogin}>
      {isLoading ? 'Connecting...' : isLoggedIn ? 'Logout' : 'Login'}
    </button>
  );
}`
    },
    {
      code: `// Step 2: Encapsulated Reducer Logic
import { useReducer } from 'react';

type State = { status: 'idle' | 'loading' | 'authenticated' };
type Action = { type: 'LOGIN_START' } | { type: 'LOGIN_SUCCESS' };

function authReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOGIN_START': return { status: 'loading' };
    case 'LOGIN_SUCCESS': return { status: 'authenticated' };
    default: return state;
  }
}

export function AuthButton() {
  const [state, dispatch] = useReducer(authReducer, { status: 'idle' });

  const handleLogin = async () => {
    dispatch({ type: 'LOGIN_START' });
    await new Promise(r => setTimeout(r, 1000));
    dispatch({ type: 'LOGIN_SUCCESS' });
  };

  return (
    <button onClick={handleLogin} disabled={state.status === 'loading'}>
      {state.status === 'loading' ? 'Connecting...' :
       state.status === 'authenticated' ? 'Logout' : 'Login'}
    </button>
  );
}`
    }
  ]);
  const [selectedLang, setSelectedLang] = useState<string>("typescript");
  const [simpleShowLineNumbers, setSimpleShowLineNumbers] = useState<boolean>(true);
  const [simpleStartLine, setSimpleStartLine] = useState<number>(1);

  const parsed = useMemo(() => parseMagicMove(input), [input]);
  const [blockIndex, setBlockIndex] = useState(0);

  useEffect(() => {
    setBlockIndex((idx) => {
      const max = Math.max(0, parsed.blocks.length - 1);
      return Math.min(Math.max(0, idx), max);
    });
  }, [parsed.blocks.length]);

  const activeBlock = parsed.blocks[blockIndex] ?? null;

  // Compute steps based on mode
  const steps = useMemo<MagicMoveStep[]>(() => {
    if (mode === "simple") {
      // Convert simple steps to MagicMoveStep format
      return simpleSteps.map((step) => ({
        lang: selectedLang,
        code: step.code,
        meta: {
          lines: simpleShowLineNumbers,
          startLine: simpleStartLine,
        },
      }));
    } else {
      // Advanced mode: use parsed steps
      return activeBlock?.steps ?? [];
    }
  }, [mode, simpleSteps, selectedLang, simpleShowLineNumbers, simpleStartLine, activeBlock]);

  const allErrors = useMemo(() => {
    if (mode === "simple") {
      // No parsing errors in simple mode
      return [];
    }
    return [...parsed.errors, ...(activeBlock?.errors ?? [])];
  }, [mode, parsed.errors, activeBlock]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stepLayouts, setStepLayouts] = useState<StepLayout[] | null>(null);
  const [layoutError, setLayoutError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadMs, setPlayheadMs] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const timeline = useMemo(() => {
    const stepCount = steps.length;
    const startHold = 250;
    const betweenHold = 120;
    const endHold = 250;
    if (stepCount <= 1) return { totalMs: startHold + endHold, startHold, betweenHold, endHold };
    const transitions = stepCount - 1;
    const totalMs = startHold + transitions * transitionMs + transitions * betweenHold + endHold;
    return { totalMs, startHold, betweenHold, endHold };
  }, [steps.length, transitionMs]);

  useEffect(() => {
    let cancelled = false;
    setLayoutError(null);
    setStepLayouts(null);

    (async () => {
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D not supported");

      const nextLayouts: StepLayout[] = [];
      for (const step of steps) {
        const { lines, bg } = await shikiTokenizeToLines({
          code: step.code,
          lang: step.lang,
          theme,
        });

        const cfg = makeDefaultLayoutConfig();
        cfg.showLineNumbers = forceLineNumbers ? true : step.meta.lines;
        cfg.startLine = step.meta.startLine;

        const layout = layoutTokenLinesToCanvas({
          ctx,
          tokenLines: lines,
          bg,
          theme: getThemeVariant(theme),
          config: cfg,
        });

        nextLayouts.push({
          layout,
          tokenLineCount: lines.length,
          startLine: cfg.startLine,
          showLineNumbers: cfg.showLineNumbers,
        });
      }

      if (cancelled) return;
      setStepLayouts(nextLayouts);
    })().catch((e: unknown) => {
      if (cancelled) return;
      setLayoutError(e instanceof Error ? e.message : "Failed to build preview");
    });

    return () => {
      cancelled = true;
    };
  }, [steps, theme, forceLineNumbers]);

  const renderAt = useCallback(
    (ms: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !stepLayouts || stepLayouts.length === 0) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cfg = makeDefaultLayoutConfig();
      canvas.width = cfg.canvasWidth;

      // Calculate dynamic height based on maximum line count across all steps
      const maxLineCount = Math.max(...stepLayouts.map((s) => s.tokenLineCount));
      const calculatedHeight = calculateCanvasHeight({
        lineCount: maxLineCount,
        lineHeight: cfg.lineHeight,
        paddingY: cfg.paddingY,
        minHeight: 1080, // Minimum Full HD height
      });
      // Only update height if it's different (avoids unnecessary resets during export)
      if (canvas.height !== calculatedHeight) {
        canvas.height = calculatedHeight;
      }
      // Ensure renderer config matches actual canvas size (otherwise drawCodeFrame clips)
      cfg.canvasHeight = canvas.height;

      const clampMs = Math.max(0, Math.min(timeline.totalMs, ms));

      const steps = stepLayouts.length;
      if (steps === 1) {
        const only = stepLayouts[0]!;
        drawCodeFrame({
          ctx,
          config: cfg,
          layout: only.layout,
          theme: getThemeVariant(theme),
          showLineNumbers: only.showLineNumbers,
          startLine: only.startLine,
          lineCount: only.tokenLineCount,
        });
        return;
      }

      let t = clampMs;
      if (t < timeline.startHold) {
        const first = stepLayouts[0]!;
        drawCodeFrame({
          ctx,
          config: cfg,
          layout: first.layout,
          theme: getThemeVariant(theme),
          showLineNumbers: first.showLineNumbers,
          startLine: first.startLine,
          lineCount: first.tokenLineCount,
        });
        return;
      }
      t -= timeline.startHold;

      for (let i = 0; i < steps - 1; i++) {
        const a = stepLayouts[i]!;
        const b = stepLayouts[i + 1]!;

        if (t <= transitionMs) {
          const progress = transitionMs <= 0 ? 1 : t / transitionMs;
          const animated = animateLayouts({ from: a.layout, to: b.layout, progress });
          drawCodeFrame({
            ctx,
            config: cfg,
            layout: b.layout,
            theme: getThemeVariant(theme),
            tokens: animated,
            showLineNumbers: a.showLineNumbers || b.showLineNumbers,
            startLine: b.startLine,
            lineCount: b.tokenLineCount,
          });
          return;
        }

        t -= transitionMs;
        if (t <= timeline.betweenHold) {
          drawCodeFrame({
            ctx,
            config: cfg,
            layout: b.layout,
            theme: getThemeVariant(theme),
            showLineNumbers: b.showLineNumbers,
            startLine: b.startLine,
            lineCount: b.tokenLineCount,
          });
          return;
        }
        t -= timeline.betweenHold;
      }

      const last = stepLayouts[steps - 1]!;
      drawCodeFrame({
        ctx,
        config: cfg,
        layout: last.layout,
        theme: getThemeVariant(theme),
        showLineNumbers: last.showLineNumbers,
        startLine: last.startLine,
        lineCount: last.tokenLineCount,
      });
    },
    [stepLayouts, theme, timeline, transitionMs]
  );

  useEffect(() => {
    renderAt(playheadMs);
  }, [playheadMs, renderAt]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastFrameRef.current = null;
      return;
    }

    const tick = (now: number) => {
      const last = lastFrameRef.current ?? now;
      lastFrameRef.current = now;
      const dt = now - last;
      setPlayheadMs((t) => {
        const next = t + dt;
        return next >= timeline.totalMs ? 0 : next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastFrameRef.current = null;
    };
  }, [isPlaying, timeline.totalMs]);

  const canExport = !!canvasRef.current && !!stepLayouts && stepLayouts.length > 0 && allErrors.length === 0;

  // Simple mode handlers
  const addSimpleStep = () => {
    setSimpleSteps([...simpleSteps, { code: `// Step ${simpleSteps.length + 1}` }]);
  };

  const removeSimpleStep = (index: number) => {
    if (simpleSteps.length <= 1) return; // Keep at least one step
    setSimpleSteps(simpleSteps.filter((_, i) => i !== index));
  };

  const updateSimpleStep = (index: number, code: string) => {
    const updated = [...simpleSteps];
    updated[index] = { code };
    setSimpleSteps(updated);
  };

  const onExport = async () => {
    if (!canvasRef.current) return;
    if (!stepLayouts || stepLayouts.length === 0) return;

    setIsExporting(true);
    setExportProgress(0);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);

    const canvas = canvasRef.current;
    const cfg = makeDefaultLayoutConfig();

    // Calculate and set fixed canvas height for export (based on max line count)
    const maxLineCount = Math.max(...stepLayouts.map((s) => s.tokenLineCount));
    const exportHeight = calculateCanvasHeight({
      lineCount: maxLineCount,
      lineHeight: cfg.lineHeight,
      paddingY: cfg.paddingY,
      minHeight: 1080,
    });
    canvas.width = cfg.canvasWidth;
    canvas.height = exportHeight;

    const durationMs = timeline.totalMs;
    const start = performance.now();
    let cancelled = false;

    const renderLoop = () => {
      if (cancelled) return;
      const elapsed = performance.now() - start;
      renderAt(elapsed);
      if (elapsed < durationMs) requestAnimationFrame(renderLoop);
    };
    requestAnimationFrame(renderLoop);

    try {
      const blob = await recordCanvasToWebm({
        canvas,
        fps,
        durationMs,
        onProgress: (elapsed, total) => setExportProgress(total <= 0 ? 0 : elapsed / total),
      });
      cancelled = true;

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (e) {
      cancelled = true;
      setLayoutError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setPlayheadMs(0);
      renderAt(0);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Magic Move → Video (MVP)</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Create animated code transitions and export as{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-white/10">.webm</code> video.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-4 rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-white/5">
          <span className="text-sm font-medium">Mode:</span>
          <div className="flex gap-2">
            <button
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${mode === "simple"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/20"
                }`}
              onClick={() => setMode("simple")}
            >
              Simple Mode
            </button>
            <button
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${mode === "advanced"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/20"
                }`}
              onClick={() => setMode("advanced")}
            >
              Advanced Mode
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column - Input Area */}
          <div className="flex flex-col gap-3">
            {mode === "simple" ? (
              // Simple Mode UI
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Code Steps</div>
                  <button
                    className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    onClick={addSimpleStep}
                  >
                    + Add Step
                  </button>
                </div>

                {/* Language Selector */}
                <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Language
                  <select
                    className="rounded-md border border-black/10 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50"
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                  >
                    {AVAILABLE_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Line Number Controls */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50">
                    <input
                      type="checkbox"
                      checked={simpleShowLineNumbers}
                      onChange={(e) => setSimpleShowLineNumbers(e.target.checked)}
                    />
                    Show line numbers
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Start Line
                    <input
                      className="rounded-md border border-black/10 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50"
                      type="number"
                      min={1}
                      value={simpleStartLine}
                      onChange={(e) => setSimpleStartLine(Math.max(1, Number(e.target.value) || 1))}
                      disabled={!simpleShowLineNumbers}
                    />
                  </label>
                </div>

                {/* Step Textareas */}
                <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2">
                  {simpleSteps.map((step, index) => (
                    <div key={index} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Step {index + 1}
                        </label>
                        {simpleSteps.length > 1 && (
                          <button
                            className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-500/20 dark:text-red-400"
                            onClick={() => removeSimpleStep(index)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <textarea
                        className="min-h-[120px] w-full resize-y rounded-xl border border-black/10 bg-white p-3 font-mono text-xs leading-5 text-zinc-900 outline-none ring-0 focus:border-black/20 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50"
                        value={step.code}
                        onChange={(e) => updateSimpleStep(index, e.target.value)}
                        spellCheck={false}
                        placeholder={`Enter code for step ${index + 1}...`}
                      />
                    </div>
                  ))}
                </div>

                {/* Simple Mode Error Display */}
                {layoutError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                    <div>{layoutError}</div>
                  </div>
                )}

                {/* Simple Mode Help */}
                <details className="rounded-xl border border-black/10 bg-white p-4 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
                  <summary className="cursor-pointer select-none font-medium text-zinc-900 dark:text-zinc-50">
                    How to use Simple Mode
                  </summary>
                  <div className="mt-3 space-y-2">
                    <div>
                      1. Select your <span className="font-semibold">programming language</span> from the dropdown.
                    </div>
                    <div>
                      2. Enter code for each step in the textareas. Each step represents one frame in the animation.
                    </div>
                    <div>
                      3. Click <span className="font-semibold">+ Add Step</span> to add more steps, or{" "}
                      <span className="font-semibold">Remove</span> to delete a step.
                    </div>
                    <div>
                      4. Toggle <span className="font-semibold">Show line numbers</span> to display line numbers in the preview.
                    </div>
                    <div>
                      5. Click <span className="font-semibold">Play</span> to preview the animation, then{" "}
                      <span className="font-semibold">Export WebM</span> to download.
                    </div>
                  </div>
                </details>
              </>
            ) : (
              // Advanced Mode UI
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Input</div>
                  <button
                    className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    onClick={() => setInput(defaultInput)}
                  >
                    Reset example
                  </button>
                </div>
                <textarea
                  className="min-h-[420px] w-full resize-y rounded-xl border border-black/10 bg-white p-4 font-mono text-xs leading-5 text-zinc-900 outline-none ring-0 focus:border-black/20 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  spellCheck={false}
                />

                {(allErrors.length > 0 || layoutError) && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                    {layoutError ? <div>{layoutError}</div> : null}
                    {allErrors.map((err: string) => (
                      <div key={err}>{err}</div>
                    ))}
                  </div>
                )}

                <details className="rounded-xl border border-black/10 bg-white p-4 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
                  <summary className="cursor-pointer select-none font-medium text-zinc-900 dark:text-zinc-50">
                    How to format input
                  </summary>
                  <div className="mt-3 space-y-2">
                    <div>
                      Use an <span className="font-semibold">outer fence of 4 backticks</span> with either:
                      <div className="mt-1 font-mono text-xs opacity-90">
                        <span>````md magic-move</span> <span className="opacity-70">or</span>{" "}
                        <span>````shiki-magic-move {"{lines:true}"}</span>
                      </div>
                    </div>
                    <div>
                      Inside, add multiple <span className="font-semibold">triple-backtick</span> code blocks (each is a step).
                    </div>
                    <div>
                      Line numbers:
                      <span className="ml-1 font-mono text-xs opacity-90">```ts {"{lines:true,startLine:5}"}</span>
                      <span className="ml-2 opacity-80">
                        (or put {"{lines:true}"} on the outer wrapper to apply to all steps)
                      </span>
                    </div>
                  </div>
                </details>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-medium">Preview</div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  onClick={() => setIsPlaying((v) => !v)}
                  disabled={!stepLayouts || allErrors.length > 0}
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  onClick={() => {
                    setIsPlaying(false);
                    setPlayheadMs(0);
                  }}
                  disabled={!stepLayouts || allErrors.length > 0}
                >
                  Reset
                </button>
              </div>
            </div>

            {mode === "advanced" && parsed.blocks.length > 1 && (
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                Sequence
                <select
                  className="rounded-md border border-black/10 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50"
                  value={String(blockIndex)}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setPlayheadMs(0);
                    setBlockIndex(Number(e.target.value) || 0);
                  }}
                >
                  {parsed.blocks.map((b, i) => (
                    <option key={`${b.kind}-${i}`} value={String(i)}>
                      {`Block ${i + 1} · ${b.kind} · ${b.steps.length} steps`}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="overflow-auto rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/5">
              <div className="w-full" style={{ minHeight: "400px", maxHeight: "80vh" }}>
                <canvas ref={canvasRef} className="w-full" style={{ display: "block" }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                Theme
                <select
                  className="rounded-md border border-black/10 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as ShikiThemeChoice)}
                >
                  {AVAILABLE_THEMES.map((t) => (
                    <option key={t} value={t}>
                      {t === "github-light" ? "GitHub Light" :
                        t === "github-dark" ? "GitHub Dark" :
                          t === "nord" ? "Nord" :
                            t === "one-dark-pro" ? "One Dark Pro" :
                              t === "vitesse-dark" ? "Vitesse Dark" :
                                t === "vitesse-light" ? "Vitesse Light" : t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                FPS
                <input
                  className="rounded-md border border-black/10 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50"
                  type="number"
                  min={10}
                  max={60}
                  value={fps}
                  onChange={(e) => setFps(Math.max(10, Math.min(60, Number(e.target.value) || 30)))}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                Transition (ms)
                <input
                  className="rounded-md border border-black/10 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50"
                  type="number"
                  min={100}
                  max={5000}
                  value={transitionMs}
                  onChange={(e) => setTransitionMs(Math.max(100, Math.min(5000, Number(e.target.value) || 800)))}
                />
              </label>

              {mode === "advanced" && (
                <label className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50">
                  <input
                    type="checkbox"
                    checked={forceLineNumbers}
                    onChange={(e) => setForceLineNumbers(e.target.checked)}
                  />
                  Force line numbers
                </label>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
                onClick={onExport}
                disabled={!canExport || isExporting}
              >
                {isExporting ? `Exporting… ${Math.round(exportProgress * 100)}%` : "Export WebM"}
              </button>

              {downloadUrl && (
                <a
                  className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                  href={downloadUrl}
                  download="magic-move.webm"
                >
                  Download magic-move.webm
                </a>
              )}

              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Total duration: {Math.round(timeline.totalMs)}ms · Steps: {steps.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

# Step-by-Step Execution Flow

This document details the exact sequence of file/function calls that happen during the app's lifecycle.

## Overview

The app transforms user input (code steps) into an animated video through several phases:
1. State initialization
2. Data transformation (SimpleStep → MagicMoveStep)
3. Tokenization and layout computation
4. Timeline calculation
5. Frame rendering (static and animated)
6. Playback animation loop
7. Video export
8. Download

---

### 1. Initial Setup & State Initialization

**File**: `app/page.tsx`

When the component mounts:
1. **State initialization** (lines 57-88):
   - `simpleSteps`: initialized with `DEFAULT_STEPS` from `app/lib/constants.ts`
   - `selectedLang`: defaults to `"typescript"`
   - `simpleShowLineNumbers`: defaults to `true`
   - `simpleStartLine`: defaults to `1`
   - `theme`: defaults to `"vitesse-dark"`
   - `fps`, `transitionMs`: playback/export settings
   - `stepLayouts`, `isPlaying`, `playheadMs`, etc.: UI state

---

### 2. Computing MagicMoveSteps (Data Transformation)

**File**: `app/page.tsx` (lines 67-76)

**Trigger**: Whenever `simpleSteps`, `selectedLang`, `simpleShowLineNumbers`, or `simpleStartLine` changes

**Function**: `useMemo` hook
```typescript
const steps = useMemo<MagicMoveStep[]>(() => {
  return simpleSteps.map((step) => ({
    lang: selectedLang,
    code: step.code,
    meta: {
      lines: simpleShowLineNumbers,
      startLine: simpleStartLine,
    },
  }));
}, [simpleSteps, selectedLang, simpleShowLineNumbers, simpleStartLine]);
```

**Responsibility**: Converts simple user input (`SimpleStep[]`) into the internal format (`MagicMoveStep[]`) used by the rendering pipeline.

---

### 3. Layout Computation (Tokenization & Positioning)

**File**: `app/page.tsx` (lines 101-149)

**Trigger**: Whenever `steps` or `theme` changes

**Function**: `useEffect` hook (async operation)

**Step-by-step execution**:

#### 3.1. Initialize canvas for measurement
```typescript
const c = document.createElement("canvas");
const ctx = c.getContext("2d");
```
- **Responsibility**: Creates an off-screen canvas for text measurement
- **Why**: Needed to calculate accurate token widths using `ctx.measureText()`

#### 3.2. For each step, tokenize with Shiki

**File**: `app/lib/magicMove/shikiHighlighter.ts`

**Function**: `shikiTokenizeToLines({ code, lang, theme })`
```typescript
const { lines, bg } = await shikiTokenizeToLines({
  code: step.code,
  lang: step.lang,
  theme,
});
```

**Internal execution** (in `shikiHighlighter.ts`):
- **Line 39-43**: Initializes Shiki highlighter (lazy, first call only):
  - Loads languages: `js`, `ts`, `tsx`, `jsx`, `json`, `sql`, `css`, `html`, `md`, `bash`, `shell`
  - Loads themes: `github-light`, `github-dark`, `nord`, `one-dark-pro`, `vitesse-dark`, `vitesse-light`
- **Line 59-72**: Tokenizes code:
  - Calls `highlighter.codeToTokensBase()` to get tokens
  - Fallback to `"text"` language if tokenization fails (unknown language)
- **Line 74-85**: Converts tokens to lines:
  - Each line becomes an array of `TokenizedToken[]`
  - Each token has: `text`, `color` (hex), `fontStyle` (optional)
- **Line 87-100**: Extracts background color from theme

**Returns**: 
- `lines`: `TokenizedToken[][]` - array of lines, each line is array of tokens
- `bg`: `string` - background color hex

#### 3.3. Create layout configuration

**File**: `app/lib/magicMove/codeLayout.ts`

**Function**: `makeDefaultLayoutConfig()`
```typescript
const cfg = makeDefaultLayoutConfig();
cfg.showLineNumbers = step.meta.lines;
cfg.startLine = step.meta.startLine;
```

**Returns** (lines 16-32):
```typescript
{
  canvasWidth: 1920,
  canvasHeight: 1080,
  paddingX: 60,
  paddingY: 60,
  lineHeight: 32,
  fontFamily: '"Cascadia Code", "Fira Code", Menlo, Monaco, "Courier New", monospace',
  fontSize: 20,
  showLineNumbers: false,
  startLine: 1,
  gutterMargin: 20,
  lineBg: { start: "rgba(255,255,255,0.08)", end: "rgba(255,255,255,0.00)" },
}
```

**Responsibility**: Provides default rendering configuration (font, sizes, padding, etc.)

#### 3.4. Layout tokens to canvas positions

**File**: `app/lib/magicMove/codeLayout.ts`

**Function**: `layoutTokenLinesToCanvas({ ctx, tokenLines, bg, theme, config })`
```typescript
const layout = layoutTokenLinesToCanvas({
  ctx,
  tokenLines: lines,
  bg,
  theme: getThemeVariant(theme),
  config: cfg,
});
```

**Internal execution** (in `codeLayout.ts`, lines 48-145):

1. **Line 51-57**: Measure character width using monospace "M":
   ```typescript
   ctx.font = `${config.fontSize}px ${config.fontFamily}`;
   const charWidth = ctx.measureText("M").width;
   ```

2. **Line 59-70**: Calculate gutter width (if line numbers enabled):
   - Determines max line number (e.g., `startLine + lineCount - 1`)
   - Measures width of max line number text
   - Adds margin: `gutterWidth = lineNumberWidth + gutterMargin`

3. **Line 72**: Calculate text starting X position:
   ```typescript
   const textX = config.paddingX + gutterWidth;
   ```

4. **Line 75-106**: Position each token:
   - **For each line** (lines 75-105):
     - Calculate Y position: `y = paddingY + lineIndex * lineHeight`
     - Track current X position starting from `textX`
     - **For each token in the line** (lines 83-99):
       - Measure token width: `width = ctx.measureText(token.text).width`
       - Create `PositionedToken`:
         ```typescript
         {
           text: token.text,
           color: token.color,
           x: currentX,
           y: y,
           fontStyle: token.fontStyle,
         }
         ```
       - Increment `currentX` by token width

5. **Lines 108-116**: Determine gutter colors:
   - Uses theme variant to set line number color and background gradient

**Returns** `LayoutResult` (lines 118-143):
```typescript
{
  bg: "#hexcolor",
  gutterWidth: number,
  gutterBg: string,
  gutterTextColor: string,
  tokens: PositionedToken[],  // All tokens with x,y positions
}
```

#### 3.5. Store layout result

**File**: `app/page.tsx` (lines 131-136)
```typescript
nextLayouts.push({
  layout,
  tokenLineCount: lines.length,
  startLine: cfg.startLine,
  showLineNumbers: cfg.showLineNumbers,
});
```

After all steps are processed:
```typescript
setStepLayouts(nextLayouts);
```

**Responsibility**: Stores computed layouts in state, triggering re-render

---

### 4. Timeline Calculation

**File**: `app/page.tsx` (lines 90-99)

**Trigger**: Whenever `steps.length` or `transitionMs` changes

**Function**: `useMemo` hook
```typescript
const timeline = useMemo(() => {
  const stepCount = steps.length;
  const startHold = 250;
  const betweenHold = 120;
  const endHold = 250;
  if (stepCount <= 1) return { totalMs: startHold + endHold, ... };
  const transitions = stepCount - 1;
  const totalMs = startHold + transitions * transitionMs + transitions * betweenHold + endHold;
  return { totalMs, startHold, betweenHold, endHold };
}, [steps.length, transitionMs]);
```

**Responsibility**: Calculates total animation duration based on number of steps and transition duration

---

### 5. Rendering a Frame

**File**: `app/page.tsx` (lines 151-257)

**Function**: `renderAt(ms: number)`

**Trigger**: 
- When `playheadMs` changes (lines 259-261)
- During playback animation loop (lines 263-289)
- During export (line 339, 362)

**Step-by-step execution**:

#### 5.1. Setup canvas dimensions (lines 159-174)
```typescript
canvas.width = cfg.canvasWidth;  // 1920
const maxLineCount = Math.max(...stepLayouts.map(s => s.tokenLineCount));
const calculatedHeight = calculateCanvasHeight({
  lineCount: maxLineCount,
  lineHeight: cfg.lineHeight,
  paddingY: cfg.paddingY,
  minHeight: 1080,
});
canvas.height = calculatedHeight;
cfg.canvasHeight = canvas.height;
```

**File**: `app/lib/magicMove/codeLayout.ts`

**Function**: `calculateCanvasHeight()` (lines 34-46)
- Calculates height to fit all lines plus one blank line at bottom
- Enforces minimum height of 1080px (Full HD)

#### 5.2. Determine which step/transition to render (lines 176-243)

**Logic flow**:
1. **Single step** (lines 179-190): Render the only step statically
2. **Before first transition** (lines 194-206): Render first step statically
3. **During transitions** (lines 209-227):
   - Calculate progress (0-1): `progress = t / transitionMs`
   - Call animation function
4. **Between transitions** (lines 230-241): Render destination step statically
5. **After last transition** (lines 244-254): Render final step statically

#### 5.3a. Static rendering (no animation)

**File**: `app/lib/magicMove/canvasRenderer.ts`

**Function**: `drawCodeFrame({ ctx, config, layout, theme, showLineNumbers, startLine, lineCount })`

**Called from**: `app/page.tsx` (lines 181-189, 196-204, 231-239, 246-254)

**Internal execution** (in `canvasRenderer.ts`):

1. **Lines 34-50**: `clearAndPaintBackground()`
   - Clears canvas: `ctx.clearRect(0, 0, canvas.width, canvas.height)`
   - Fills background: `ctx.fillStyle = layout.bg; ctx.fillRect(...)`

2. **Lines 52-61**: Draw gutter background (if line numbers enabled)
   - Creates gradient: `ctx.createLinearGradient()`
   - Fills gutter area with gradient

3. **Lines 63-77**: Draw line numbers (if enabled)
   - For each line:
     - Calculate line number: `lineNum = startLine + i`
     - Calculate Y position: `y = config.paddingY + i * config.lineHeight`
     - Draw line background: `ctx.fillRect()` with gradient
     - Draw line number text: `ctx.fillText(lineNum, x, y)`

4. **Lines 79-96**: Draw tokens
   - For each token in `layout.tokens`:
     - Set font style (bold/italic if specified)
     - Set color: `ctx.fillStyle = token.color`
     - Draw text: `ctx.fillText(token.text, token.x, token.y)`

#### 5.3b. Animated rendering (during transitions)

**File**: `app/page.tsx` (lines 213-226)
```typescript
const progress = transitionMs <= 0 ? 1 : t / transitionMs;
const animated = animateLayouts({ from: a.layout, to: b.layout, progress });
drawCodeFrame({
  ctx,
  config: cfg,
  layout: b.layout,  // Use destination layout for background/gutter
  theme: getThemeVariant(theme),
  tokens: animated,  // Use animated tokens instead of layout.tokens
  showLineNumbers: a.showLineNumbers || b.showLineNumbers,
  startLine: b.startLine,
  lineCount: b.tokenLineCount,
});
```

**File**: `app/lib/magicMove/animate.ts`

**Function**: `animateLayouts({ from, to, progress })`

**Internal execution** (lines 20-85):

1. **Lines 22-37**: Build occurrence maps
   - Creates `Map<string, number>` for tracking how many times each token text appears
   - Used to match tokens in order (e.g., 1st "const" → 1st "const", 2nd "const" → 2nd "const")

2. **Lines 39-44**: Create matched tokens map
   - Key: `${tokenText}:${occurrenceIndex}`
   - Value: `PositionedToken` from destination layout
   - Purpose: Fast lookup for matching source tokens to destination

3. **Lines 46-83**: Animate each token
   - **For each token in source layout**:
     - **Lines 51-62**: Check if token exists in destination
       - If matched: interpolate position
         ```typescript
         x: fromToken.x + (toToken.x - fromToken.x) * progress
         y: fromToken.y + (toToken.y - fromToken.y) * progress
         opacity: 1
         ```
       - If unmatched (removed): fade out
         ```typescript
         x: fromToken.x
         y: fromToken.y
         opacity: 1 - progress
         ```
     - **Lines 64-73**: Handle new tokens (in destination but not source)
       - Fade in at destination position:
         ```typescript
         x: toToken.x
         y: toToken.y
         opacity: progress
         ```

**Returns**: `AnimatedToken[]` - same as `PositionedToken` but with `opacity: number`

**Back to `canvasRenderer.ts`**: `drawCodeFrame()` with `tokens` parameter
- **Lines 79-96**: Draws animated tokens with opacity
  - Sets global alpha: `ctx.globalAlpha = token.opacity`
  - Draws text at interpolated positions
  - Resets alpha: `ctx.globalAlpha = 1`

---

### 6. Playback Animation Loop

**File**: `app/page.tsx` (lines 263-289)

**Trigger**: When `isPlaying` changes to `true`

**Function**: `useEffect` hook with `requestAnimationFrame` loop

**Step-by-step execution**:

1. **Line 271**: Define tick function
   ```typescript
   const tick = (now: number) => {
     const last = lastFrameRef.current ?? now;
     lastFrameRef.current = now;
     const dt = now - last;  // Delta time since last frame
     setPlayheadMs((t) => {
       const next = t + dt;
       return next >= timeline.totalMs ? 0 : next;  // Loop
     });
     rafRef.current = requestAnimationFrame(tick);
   };
   ```

2. **Line 282**: Start loop
   ```typescript
   rafRef.current = requestAnimationFrame(tick);
   ```

3. **Lines 259-261**: Render each frame
   ```typescript
   useEffect(() => {
     renderAt(playheadMs);
   }, [playheadMs, renderAt]);
   ```

**Responsibility**: Smooth playback by updating `playheadMs` on every animation frame

---

### 7. Export to Video

**File**: `app/page.tsx` (lines 309-364)

**Function**: `onExport()` (async)

**Trigger**: User clicks "Export" button

**Step-by-step execution**:

#### 7.1. Setup (lines 313-330)
```typescript
setIsExporting(true);
setExportProgress(0);

const canvas = canvasRef.current;
const cfg = makeDefaultLayoutConfig();

// Set fixed dimensions for export
const maxLineCount = Math.max(...stepLayouts.map(s => s.tokenLineCount));
const exportHeight = calculateCanvasHeight({
  lineCount: maxLineCount,
  lineHeight: cfg.lineHeight,
  paddingY: cfg.paddingY,
  minHeight: 1080,
});
canvas.width = cfg.canvasWidth;
canvas.height = exportHeight;
```

#### 7.2. Create render loop (lines 332-342)
```typescript
const durationMs = timeline.totalMs;
const start = performance.now();
let cancelled = false;

const renderLoop = () => {
  if (cancelled) return;
  const elapsed = performance.now() - start;
  renderAt(elapsed);  // Render current frame
  if (elapsed < durationMs) requestAnimationFrame(renderLoop);
};
requestAnimationFrame(renderLoop);
```

**Responsibility**: Drives through the entire timeline, rendering each frame

#### 7.3. Record canvas to WebM

**File**: `app/lib/video/recordCanvas.ts`

**Function**: `recordCanvasToWebm({ canvas, fps, durationMs, onProgress })`

**Called from**: `app/page.tsx` (lines 344-350)

**Internal execution** (in `recordCanvas.ts`, lines 20-77):

1. **Lines 22-23**: Create media stream
   ```typescript
   const stream = canvas.captureStream(fps);
   ```
   - **Responsibility**: Captures canvas frames at specified FPS

2. **Lines 25-45**: Select codec and create recorder
   ```typescript
   const pickMimeType = () => {
     if (isSupported("video/webm;codecs=vp9")) return "video/webm;codecs=vp9";
     if (isSupported("video/webm;codecs=vp8")) return "video/webm;codecs=vp8";
     return "video/webm";
   };
   
   const mimeType = pickMimeType();
   const bitrate = mimeType.includes("vp9") ? 10_000_000 : 8_000_000;
   
   const recorder = new MediaRecorder(stream, {
     mimeType,
     videoBitsPerSecond: bitrate,
   });
   ```
   - **Responsibility**: Selects best available codec with appropriate bitrate for quality

3. **Lines 47-49**: Setup data collection
   ```typescript
   const chunks: Blob[] = [];
   recorder.ondataavailable = (event) => chunks.push(event.data);
   ```

4. **Lines 51-62**: Track progress
   ```typescript
   const progressStart = performance.now();
   const progressLoop = () => {
     const elapsed = performance.now() - progressStart;
     onProgress(elapsed, durationMs);
     if (elapsed < durationMs) {
       requestAnimationFrame(progressLoop);
     }
   };
   requestAnimationFrame(progressLoop);
   ```

5. **Lines 64-73**: Wait for recording completion
   ```typescript
   recorder.start(250);  // Chunk interval: 250ms
   
   await new Promise<void>((resolve) => {
     setTimeout(() => {
       recorder.stop();
       recorder.onstop = () => resolve();
     }, durationMs + 500);  // Buffer for final chunks
   });
   ```

6. **Lines 75-76**: Create final blob
   ```typescript
   const blob = new Blob(chunks, { type: mimeType });
   return blob;
   ```

#### 7.4. Cleanup and download (lines 351-363)
```typescript
const blob = await recordCanvasToWebm(...);
cancelled = true;  // Stop render loop

const url = URL.createObjectURL(blob);
setDownloadUrl(url);

setIsExporting(false);
setExportProgress(0);
setPlayheadMs(0);
renderAt(0);  // Reset to first frame
```

**Responsibility**: Creates download URL and resets UI state

---

### 8. User Downloads Video

**File**: `app/page.tsx` (lines 618-624)

When `downloadUrl` is set, a download button appears:
```typescript
{downloadUrl && (
  <Button variant="outline" size="sm" asChild className="gap-2">
    <a href={downloadUrl} download="magic-move.webm">
      <Film className="w-4 h-4" />
      Save Video
    </a>
  </Button>
)}
```

**Responsibility**: Provides download link using the blob URL created in step 7.4


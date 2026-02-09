"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import LightRays from "./LightRays";

export function ThemedLightRays() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === "dark";
  const raysColor = isDark ? "#ffffff" : "#000000";

  return (
    <div className="fixed inset-0 z-[1] pointer-events-none" style={{ opacity: isDark ? 1 : 0.3 }}>
      <LightRays
        raysOrigin="top-center"
        raysColor={raysColor}
        raysSpeed={0.8}
        lightSpread={0.6}
        rayLength={2.5}
        followMouse={true}
        mouseInfluence={0.08}
        noiseAmount={0.05}
        distortion={0.1}
        pulsating={false}
        fadeDistance={1.2}
        saturation={isDark ? 0.7 : 0.4}
      />
    </div>
  );
}

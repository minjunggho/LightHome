"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Full-screen lighthouse background driven by horizontal cursor position.
 *
 * Instead of scrubbing a <video> (which decodes from the nearest keyframe and
 * stutters on arbitrary seeks), we use a pre-sliced image sequence. The frames
 * cover the bright part of the clip where the beam sweeps left -> right across
 * the sky, so mapping cursor X straight onto the frame index makes the light
 * follow the cursor: far left -> beam left, far right -> beam right.
 */
const FRAME_COUNT = 95;

const FRAMES = Array.from(
  { length: FRAME_COUNT },
  (_, i) => `/frames/frame_${String(i + 1).padStart(4, "0")}.webp`,
);

const INITIAL_INDEX = Math.floor(FRAME_COUNT / 2); // beam pointing up, centered

export default function LighthouseBackground() {
  const imgRef = useRef<HTMLImageElement>(null);

  // Frame we want to show next vs. the one currently painted.
  const targetIndexRef = useRef(INITIAL_INDEX);
  const currentIndexRef = useRef(INITIAL_INDEX);
  // Coalesces bursts of mousemove events into one paint per animation frame.
  const rafRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);

  // Preload + decode every frame up front so scrubbing never hits the network
  // or a decode stall mid-sweep.
  useEffect(() => {
    let cancelled = false;
    let loaded = 0;

    const markLoaded = () => {
      loaded += 1;
      if (!cancelled && loaded >= FRAME_COUNT) setReady(true);
    };

    FRAMES.forEach((src) => {
      const img = new Image();
      img.src = src;
      // decode() resolves once the bitmap is ready; count failures too so a
      // single bad frame can't wedge the loader.
      img.decode().then(markLoaded, markLoaded);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Cursor X -> frame index (absolute mapping across the viewport width).
  useEffect(() => {
    const paint = () => {
      rafRef.current = null;
      const idx = targetIndexRef.current;
      if (idx !== currentIndexRef.current && imgRef.current) {
        imgRef.current.src = FRAMES[idx];
        currentIndexRef.current = idx;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const ratio = e.clientX / window.innerWidth;
      const idx = Math.max(
        0,
        Math.min(FRAME_COUNT - 1, Math.round(ratio * (FRAME_COUNT - 1))),
      );
      targetIndexRef.current = idx;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(paint);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black" style={{ zIndex: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- frame scrubbing
          needs direct, synchronous src swaps; next/image would defeat the
          preloaded-bitmap strategy. */}
      <img
        ref={imgRef}
        src={FRAMES[INITIAL_INDEX]}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-full w-full object-cover transition-opacity duration-500"
        style={{ objectPosition: "70% top", opacity: ready ? 1 : 0 }}
      />
    </div>
  );
}

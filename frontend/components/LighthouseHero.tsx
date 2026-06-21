"use client";

import Link from "next/link";
import { ArrowRight, EyeOff, ScanSearch } from "lucide-react";
import { useEffect, useRef } from "react";

const FRAME_COUNT = 95;
const FRAMES = Array.from(
  { length: FRAME_COUNT },
  (_, index) => `/frames/frame_${String(index + 1).padStart(4, "0")}.webp`,
);
const INITIAL_FRAME = Math.floor(FRAME_COUNT / 2);

export function LighthouseHero() {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    FRAMES.forEach((frame) => {
      const image = new window.Image();
      image.src = frame;
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let animationFrame: number | null = null;

    const updateBeam = (event: MouseEvent) => {
      if (animationFrame !== null) return;

      animationFrame = window.requestAnimationFrame(() => {
        const ratio = Math.min(1, Math.max(0, event.clientX / window.innerWidth));
        const frameIndex = Math.round(ratio * (FRAME_COUNT - 1));

        if (imageRef.current) {
          imageRef.current.src = FRAMES[frameIndex];
          imageRef.current.dataset.frame = String(frameIndex + 1);
        }

        animationFrame = null;
      });
    };

    window.addEventListener("mousemove", updateBeam, { passive: true });

    return () => {
      window.removeEventListener("mousemove", updateBeam);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <section className="hero-shell" aria-labelledby="hero-title">
      <div className="hero-frame">
        {/* The frame sequence maps cursor position to the lighthouse beam angle. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          className="hero-image"
          src={FRAMES[INITIAL_FRAME]}
          alt="Lighthouse beam sweeping across a stormy coast"
          data-frame={INITIAL_FRAME + 1}
          draggable={false}
          fetchPriority="high"
        />
        <div className="hero-scrim" />

        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="live-dot" />
            Structural safety before explicit content
          </div>
          <h1 id="hero-title">LightHome</h1>
          <p className="hero-lead">
            Catch the shift from friendly rapport to isolation and secrecy while
            the evidence is still subtle, explainable, and reviewable.
          </p>
          <div className="hero-actions">
            <Link href="/parent" className="primary-button">
              <EyeOff size={18} /> Parent view <ArrowRight size={17} />
            </Link>
            <Link href="/platform" className="secondary-button">
              <ScanSearch size={18} /> Trust &amp; safety
            </Link>
          </div>
        </div>

        <div className="hero-facts" aria-label="LightHome overview">
          <div><strong>4</strong><span>tracked stages</span></div>
          <div><strong>2</strong><span>accountable views</span></div>
          <div><strong>0</strong><span>parent transcript</span></div>
        </div>
      </div>
    </section>
  );
}

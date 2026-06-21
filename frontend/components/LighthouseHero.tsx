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
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    FRAMES.forEach((frame) => {
      const image = new window.Image();
      image.src = frame;
    });

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let animationFrame: number | null = null;
    // While the user is scrolling through the transition the beam stops
    // following the cursor and the frame is parked on the end of the sweep, so
    // the hero dissolves from a settled "last frame" into the video's start.
    let transitioning = false;

    const updateBeam = (event: MouseEvent) => {
      if (transitioning || animationFrame !== null) return;

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

    // Scroll-driven crossfade: the pinned hero fades to 0 over the first
    // viewport of scroll, revealing the (playing) video backdrop beneath it.
    let scrollFrame: number | null = null;
    const onScroll = () => {
      if (scrollFrame !== null) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = null;
        const progress = Math.min(
          1,
          Math.max(0, window.scrollY / (window.innerHeight * 0.85)),
        );
        const section = sectionRef.current;
        if (section) {
          section.style.opacity = String(1 - progress);
          section.style.pointerEvents = progress > 0.85 ? "none" : "";
        }
        if (progress > 0.02) {
          if (!transitioning) {
            transitioning = true;
            if (imageRef.current) {
              imageRef.current.src = FRAMES[FRAME_COUNT - 1];
              imageRef.current.dataset.frame = String(FRAME_COUNT);
            }
          }
        } else {
          transitioning = false;
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    if (!reduceMotion) {
      window.addEventListener("mousemove", updateBeam, { passive: true });
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", updateBeam);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
    };
  }, []);

  return (
    <section ref={sectionRef} className="hero-shell" aria-labelledby="hero-title">
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

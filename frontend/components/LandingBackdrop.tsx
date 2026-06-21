"use client";

import { useEffect, useRef } from "react";

/**
 * Fixed full-viewport video backdrop for the landing page.
 *
 * cut.mp4 (transcoded from the dropped ProRes cut.mov) is the transition out of
 * the hero and then the page background. The lighthouse hero sits opaque over
 * this; once the viewer scrolls past the hero the clip plays through once and
 * holds on its last frame (no `loop`), so it reads as a calm still backdrop the
 * content rides over. Honors prefers-reduced-motion by staying on frame one.
 */
export function LandingBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reflect muted to the DOM property (React doesn't reliably) so playback is
    // allowed without a gesture.
    video.muted = true;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let played = false;
    const onScroll = () => {
      if (played) return;
      // Fire as soon as the crossfade begins so the clip is already in motion
      // behind the dissolving hero.
      if (window.scrollY > window.innerHeight * 0.1) {
        played = true;
        video.play().catch(() => {
          /* autoplay blocked — leave it on the first frame */
        });
        window.removeEventListener("scroll", onScroll);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="landing-backdrop" aria-hidden="true">
      <video
        ref={videoRef}
        className="landing-backdrop-video"
        muted
        playsInline
        preload="auto"
      >
        <source src="/cut.mp4" type="video/mp4" />
      </video>
      <div className="landing-backdrop-scrim" />
    </div>
  );
}

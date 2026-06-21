"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTypewriter } from "@/lib/useTypewriter";

const TYPEWRITER_TEXT =
  "A predator can go from hello to high-risk grooming in 45 minutes. Lighthome catches it at minute 12.";

const PILLS = [
  { label: "Watch console", href: "/dashboard" },
  { label: "Trust & Safety panel", href: "/platform" },
  { label: "How it works", href: "/#how" },
];

const pillBase =
  "inline-flex items-center justify-center rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap transition-colors duration-200";

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function Hero() {
  const { displayed, done } = useTypewriter(TYPEWRITER_TEXT);

  // Pills fade/slide in 400ms after load, independent of the typewriter.
  const [pillsVisible, setPillsVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setPillsVisible(true), 400);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <section className="relative z-[1] flex h-screen flex-col justify-end overflow-hidden px-5 pb-12 sm:px-8 md:justify-center md:px-10 md:pb-0">
      <div className="relative z-10 max-w-xl">
        {/* Blurred intro label */}
        <div
          className="mb-5 select-none sm:mb-6"
          style={{
            pointerEvents: "none",
            fontSize: "clamp(18px, 4vw, 26px)",
            lineHeight: 1.3,
            fontWeight: 400,
            color: "#000",
            filter: "blur(4px)",
          }}
        >
          Meet Lighthome,
          <br />
          the watch that reads the shape of a conversation
        </div>

        {/* Typewriter line */}
        <p
          className="mb-5 text-black sm:mb-6"
          style={{
            fontSize: "clamp(18px, 4vw, 26px)",
            lineHeight: 1.35,
            fontWeight: 400,
            minHeight: "72px",
          }}
        >
          {displayed}
          {!done && (
            <span
              className="ml-[2px] inline-block h-[1.1em] w-[2px] bg-black align-middle"
              style={{ animation: "blink 1s step-end infinite" }}
            />
          )}
        </p>

        {/* Action pills */}
        <div
          className="flex flex-wrap gap-y-1"
          style={{
            opacity: pillsVisible ? 1 : 0,
            transform: pillsVisible ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}
        >
          {PILLS.map((pill) => (
            <Link
              key={pill.label}
              href={pill.href}
              className={`${pillBase} border border-black/10 bg-white text-black hover:bg-black hover:text-white`}
            >
              {pill.label}
            </Link>
          ))}

          <Link
            href="/dashboard"
            className={`${pillBase} gap-2 border border-white bg-transparent text-white hover:bg-white hover:text-black sm:gap-3`}
          >
            <span>Open the dashboard</span>
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}

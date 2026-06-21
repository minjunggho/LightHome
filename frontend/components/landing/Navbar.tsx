"use client";

import Link from "next/link";
import { Fragment, useState } from "react";

const NAV_LINKS = [
  { label: "How it works", href: "/#how" },
  { label: "Research", href: "/#research" },
  { label: "Trust & Safety", href: "/platform" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 z-10 flex w-full items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <span
            className="text-[21px] tracking-tight text-black sm:text-[26px]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Lighthome
          </span>
          <span
            className="text-[25px] text-black select-none sm:text-[30px]"
            style={{ letterSpacing: "-0.02em" }}
          >
            ✳︎
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center text-[23px] text-black md:flex">
          {NAV_LINKS.map((link, i) => (
            <Fragment key={link.label}>
              <Link href={link.href} className="transition-opacity hover:opacity-60">
                {link.label}
              </Link>
              {i < NAV_LINKS.length - 1 && <span>,&nbsp;</span>}
            </Fragment>
          ))}
        </nav>

        {/* Desktop CTA */}
        <Link
          href="/dashboard"
          className="hidden text-[23px] text-black underline underline-offset-2 transition-opacity hover:opacity-60 md:inline"
        >
          Open dashboard
        </Link>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="relative z-[11] flex flex-col gap-[5px] md:hidden"
        >
          <span
            className={`h-[2px] w-6 bg-black transition-all duration-300 ${
              menuOpen ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-[2px] w-6 bg-black transition-all duration-300 ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-[2px] w-6 bg-black transition-all duration-300 ${
              menuOpen ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </button>
      </header>

      {/* Mobile overlay */}
      <div
        className="fixed inset-0 z-[9] flex flex-col justify-center items-start gap-8 bg-white/95 px-8 backdrop-blur-sm transition-opacity duration-300 md:hidden"
        style={{
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
        }}
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="text-[32px] font-medium text-black"
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/dashboard"
          className="text-[32px] font-medium text-black underline"
          onClick={() => setMenuOpen(false)}
        >
          Open dashboard
        </Link>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { Menu, TowerControl, X } from "lucide-react";
import { useState } from "react";

type SiteHeaderProps = {
  active: "home" | "parent" | "platform";
};

export function SiteHeader({ active }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="LightHome home">
          <span className="brand-mark"><TowerControl size={20} /></span>
          <span>LightHome</span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link className={active === "home" ? "active" : ""} href="/">Overview</Link>
          <Link className={active === "parent" ? "active" : ""} href="/parent">Parent view</Link>
          <Link className={active === "platform" ? "active" : ""} href="/platform">Trust &amp; safety</Link>
          <Link href="/#method">Method</Link>
        </nav>

        <Link href="/platform" className="header-action">
          Review demo
        </Link>

        <button
          className="menu-button"
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <Link href="/" onClick={() => setOpen(false)}>Overview</Link>
          <Link href="/parent" onClick={() => setOpen(false)}>Parent view</Link>
          <Link href="/platform" onClick={() => setOpen(false)}>Trust &amp; safety</Link>
          <Link href="/#method" onClick={() => setOpen(false)}>Method</Link>
        </nav>
      )}
    </header>
  );
}

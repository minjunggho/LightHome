"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Filter,
  UserRoundCheck,
} from "lucide-react";
import { useState } from "react";

import { PlatformDemo } from "@/components/demo/PlatformDemo";
import { SiteHeader } from "@/components/SiteHeader";

export default function PlatformPage() {
  const [status, setStatus] = useState("Open review");

  return (
    <main className="dashboard-page platform-dashboard">
      <SiteHeader active="platform" />

      <section className="platform-topbar">
        <div>
          <Link href="/" className="back-link light"><ArrowLeft size={16} /> Overview</Link>
          <h1>Trust &amp; safety review</h1>
        </div>
        <div className="review-actions">
          <button type="button" title="Filter queue"><Filter size={17} /> Filter</button>
          <button type="button" title="Assign review"><UserRoundCheck size={17} /> Assign</button>
          <button type="button" className="resolve-button" onClick={() => setStatus("Resolved")}>
            <Check size={17} /> {status}
          </button>
        </div>
      </section>

      <PlatformDemo />
    </main>
  );
}

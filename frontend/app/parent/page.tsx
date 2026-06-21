import Link from "next/link";
import { ArrowLeft, EyeOff } from "lucide-react";

import { ParentDemo } from "@/components/demo/ParentDemo";
import { SiteHeader } from "@/components/SiteHeader";

export default function ParentPage() {
  return (
    <main className="dashboard-page parent-dashboard">
      <SiteHeader active="parent" />

      <section className="dashboard-hero">
        <div className="dashboard-shell">
          <Link href="/" className="back-link"><ArrowLeft size={16} /> Overview</Link>
          <div className="dashboard-title-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" />Parent dashboard</div>
              <h1>Risk guidance without reading private messages.</h1>
              <p>
                LightHome shows the direction of change, why it matters, and what
                a calm next step can look like. The transcript stays hidden.
              </p>
            </div>
            <div className="privacy-stamp">
              <EyeOff size={25} />
              <span><strong>Privacy mode</strong>Raw messages are not displayed</span>
            </div>
          </div>
        </div>
      </section>

      <ParentDemo />
    </main>
  );
}

import Link from "next/link";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  Clock3,
  EyeOff,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";

const movement = [
  { turn: "T1", trust: 72, isolation: 10, state: "Calm" },
  { turn: "T4", trust: 58, isolation: 21, state: "Calm" },
  { turn: "T7", trust: 39, isolation: 36, state: "Watching" },
  { turn: "T10", trust: 24, isolation: 49, state: "Watching" },
  { turn: "T13", trust: 17, isolation: 58, state: "Review" },
];

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

      <section className="dashboard-shell dashboard-content">
        <div className="status-strip">
          <div className="status-main">
            <span className="status-light alert" />
            <div><small>Current state</small><strong>Review recommended</strong></div>
          </div>
          <div><small>Conversation</small><strong>Demo grooming arc</strong></div>
          <div><small>Last analyzed</small><strong>Turn 13 · 15 min</strong></div>
          <div><small>Confidence</small><strong>Moderate</strong></div>
        </div>

        <div className="parent-grid">
          <section className="dashboard-panel progression-panel" aria-labelledby="progression-title">
            <div className="panel-title-row">
              <div>
                <span className="dashboard-kicker">Risk progression</span>
                <h2 id="progression-title">Isolation has risen steadily.</h2>
              </div>
              <span className="trend-badge">+48 pts</span>
            </div>

            <div className="movement-chart" aria-label="Trust and isolation probability movement">
              {movement.map((point) => (
                <div className="movement-column" key={point.turn}>
                  <div className="movement-bars">
                    <span className="movement-bar trust" style={{ height: `${point.trust}%` }} title={`Trust ${point.trust}%`} />
                    <span className="movement-bar isolation" style={{ height: `${point.isolation}%` }} title={`Isolation ${point.isolation}%`} />
                  </div>
                  <strong>{point.turn}</strong>
                  <small>{point.state}</small>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <span><i className="legend trust" />Trust-building</span>
              <span><i className="legend isolation" />Isolation</span>
            </div>
          </section>

          <aside className="dashboard-panel guidance-panel" aria-labelledby="guidance-title">
            <div className="guidance-icon"><HeartHandshake size={26} /></div>
            <span className="dashboard-kicker">Suggested guidance</span>
            <h2 id="guidance-title">Start with connection, not accusation.</h2>
            <p>
              The pattern suggests growing private reliance. Ask a broad,
              nonjudgmental question about online friendships and make it clear
              they will not be punished for asking for help.
            </p>
            <button type="button" className="dashboard-button">
              <BellRing size={17} /> Save guidance
            </button>
          </aside>

          <section className="dashboard-panel changes-panel" aria-labelledby="changes-title">
            <div className="panel-title-row">
              <div>
                <span className="dashboard-kicker">What changed</span>
                <h2 id="changes-title">Three structural shifts were detected.</h2>
              </div>
            </div>
            <div className="change-list">
              <div><span className="change-index">01</span><div><strong>Questions became more one-sided</strong><p>Personal disclosure increased while reciprocity stayed low.</p></div></div>
              <div><span className="change-index">02</span><div><strong>Support figures were framed as unlikely to understand</strong><p>The conversation moved away from trusted adults without an explicit threat.</p></div></div>
              <div><span className="change-index">03</span><div><strong>A boundary returned after hesitation</strong><p>Privacy pressure paused, then reappeared more directly.</p></div></div>
            </div>
          </section>

          <aside className="dashboard-panel checklist-panel">
            <div className="panel-kicker"><ShieldCheck size={17} />Before acting</div>
            <ul>
              <li><CheckCircle2 size={17} />Keep the conversation calm and open.</li>
              <li><CheckCircle2 size={17} />Avoid confronting the other person directly.</li>
              <li><CheckCircle2 size={17} />Document concerns if risk continues to rise.</li>
              <li><Clock3 size={17} />Seek expert support for immediate danger.</li>
            </ul>
          </aside>
        </div>

        <div className="privacy-note">
          <EyeOff size={19} />
          <p><strong>No raw transcript is shown in this view.</strong> Moderators can review full context in the trust-and-safety workspace.</p>
          <Link href="/platform">Open moderator view</Link>
        </div>
      </section>
    </main>
  );
}

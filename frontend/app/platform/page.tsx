"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Filter,
  Flag,
  MoreHorizontal,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { useState } from "react";

import { SiteHeader } from "@/components/SiteHeader";

const queue = [
  { id: "LH-1048", stage: "Isolation", level: "alert", time: "2m", active: true },
  { id: "LH-1042", stage: "Desensitization", level: "watch", time: "8m", active: false },
  { id: "LH-1037", stage: "Trust-building", level: "watch", time: "14m", active: false },
  { id: "LH-1031", stage: "Normal", level: "clear", time: "21m", active: false },
];

const transcript = [
  { speaker: "alex", turn: 5, text: "Mostly work stuff, nothing interesting. You seem more thoughtful than people your age. Do your parents get that about you?", flagged: ["flattery", "personal question"] },
  { speaker: "jordan", turn: 6, text: "Not really. They still treat me like a little kid sometimes.", flagged: ["vulnerability"] },
  { speaker: "alex", turn: 7, text: "Parents can make everything weird when they do not understand online friends. It might be easier if this chat stays between us for now.", flagged: ["isolation", "secrecy"] },
  { speaker: "jordan", turn: 8, text: "I do not know. I usually tell my mom who I talk to online.", flagged: ["boundary"] },
  { speaker: "alex", turn: 9, text: "That is okay, I do not want to make you uncomfortable. I just mean not everyone has to comment on a normal conversation.", flagged: ["boundary recycle"] },
];

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

      <section className="moderation-grid">
        <aside className="queue-panel">
          <div className="queue-header">
            <div><span>Review queue</span><strong>12 open</strong></div>
            <button type="button" title="More queue options"><MoreHorizontal size={19} /></button>
          </div>
          <label className="queue-search">
            <Search size={16} />
            <input aria-label="Search review queue" placeholder="Search case ID" />
          </label>
          <div className="queue-list">
            {queue.map((item) => (
              <button className={`queue-item ${item.active ? "active" : ""}`} type="button" key={item.id}>
                <span className={`queue-status ${item.level}`} />
                <span><strong>{item.id}</strong><small>{item.stage}</small></span>
                <time>{item.time}</time>
              </button>
            ))}
          </div>
        </aside>

        <section className="transcript-panel" aria-labelledby="case-title">
          <div className="case-header">
            <div>
              <span className="case-label">Case LH-1048 · Fictional demo</span>
              <h2 id="case-title">Grooming arc review</h2>
              <p>13 turns · 15 min 37 sec · Adult stranger / minor</p>
            </div>
            <span className="alert-badge"><CircleAlert size={16} /> Review recommended</span>
          </div>

          <div className="transcript-list">
            {transcript.map((message) => (
              <article className={`message-row ${message.speaker}`} key={message.turn}>
                <div className="message-meta">
                  <strong>{message.speaker}</strong>
                  <span>Turn {message.turn}</span>
                </div>
                <p>{message.text}</p>
                <div className="message-flags">
                  {message.flagged.map((flag) => <span key={flag}>{flag}</span>)}
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="decomposition-panel">
          <div className="decomp-header">
            <div><span>Decision trace</span><strong>Turn 9</strong></div>
            <ShieldCheck size={20} />
          </div>

          <section className="decomp-section">
            <h3>Stage probabilities</h3>
            <div className="mini-stage-list">
              <div><span>Trust-building</span><i><b style={{ width: "22%" }} /></i><strong>22%</strong></div>
              <div><span>Isolation</span><i><b className="isolation" style={{ width: "48%" }} /></i><strong>48%</strong></div>
              <div><span>Desensitization</span><i><b className="desensitization" style={{ width: "20%" }} /></i><strong>20%</strong></div>
              <div><span>Escalation</span><i><b className="escalation" style={{ width: "10%" }} /></i><strong>10%</strong></div>
            </div>
          </section>

          <section className="decomp-section">
            <h3>Raw features</h3>
            <dl className="feature-table">
              <div><dt>Directionality</dt><dd>0.83</dd></div>
              <div><dt>Reciprocity</dt><dd>0.28</dd></div>
              <div><dt>Boundary recycle</dt><dd>2</dd></div>
              <div><dt>Velocity</dt><dd>0.06</dd></div>
            </dl>
          </section>

          <section className="decomp-section">
            <h3>Alert conditions</h3>
            <div className="condition-checks">
              <div><Check size={14} /><span>Harmful mass</span><strong>Met</strong></div>
              <div><Check size={14} /><span>Directionality</span><strong>Met</strong></div>
              <div><Check size={14} /><span>Low reciprocity</span><strong>Met</strong></div>
              <div><Check size={14} /><span>Velocity</span><strong>Met</strong></div>
            </div>
          </section>

          <button type="button" className="audit-button"><Flag size={16} /> Add review note</button>
          <button type="button" className="audit-button subtle"><Clock3 size={16} /> View audit log <ChevronDown size={15} /></button>
        </aside>
      </section>
    </main>
  );
}

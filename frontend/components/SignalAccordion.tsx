"use client";

import { ChevronDown, Gauge, MessageCircleQuestion, Repeat2, Scale } from "lucide-react";
import { useState } from "react";

const signals = [
  {
    title: "Directionality",
    summary: "Who is doing most of the asking?",
    detail: "Tracks whether one participant consistently extracts personal information while revealing little in return.",
    icon: MessageCircleQuestion,
  },
  {
    title: "Reciprocity",
    summary: "Is disclosure mutual or one-sided?",
    detail: "Separates ordinary back-and-forth from conversations where vulnerability flows mostly in one direction.",
    icon: Scale,
  },
  {
    title: "Boundary recycling",
    summary: "Does pressure return after hesitation?",
    detail: "Looks for a boundary being tested, briefly respected, and then reintroduced in a more direct form.",
    icon: Repeat2,
  },
  {
    title: "Escalation velocity",
    summary: "How quickly is the interaction changing?",
    detail: "Measures movement from rapport toward isolation, secrecy, and boundary pressure across multiple turns.",
    icon: Gauge,
  },
];

export function SignalAccordion() {
  const [active, setActive] = useState(0);

  return (
    <section className="accordion-section" aria-labelledby="accordion-heading">
      <div className="section-shell accordion-shell">
        <div className="accordion-intro">
          <div className="eyebrow"><span className="eyebrow-dot" />Structural signals</div>
          <h2 id="accordion-heading">Four signals. One evolving conversation.</h2>
          <p>
            Each signal can be harmless alone. LightHome watches how they combine
            and change over time.
          </p>
        </div>

        <div className="accordion-list">
          {signals.map((signal, index) => {
            const Icon = signal.icon;
            const expanded = active === index;
            return (
              <div className={`accordion-item ${expanded ? "expanded" : ""}`} key={signal.title}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setActive(expanded ? -1 : index)}
                >
                  <span className="accordion-icon"><Icon size={22} /></span>
                  <span className="accordion-heading">
                    <strong>{signal.title}</strong>
                    <small>{signal.summary}</small>
                  </span>
                  <ChevronDown className="accordion-chevron" size={20} />
                </button>
                {expanded && <p>{signal.detail}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

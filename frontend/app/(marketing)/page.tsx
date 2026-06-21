import Link from "next/link";
import { AlertTriangle, ArrowRight, EyeOff, TowerControl, Users } from "lucide-react";

import { LandingBackdrop } from "@/components/LandingBackdrop";
import { LighthouseHero } from "@/components/LighthouseHero";
import { SignalAccordion } from "@/components/SignalAccordion";
import { SiteHeader } from "@/components/SiteHeader";

const detectedSignals = [
  { label: "Secrecy request", quote: "“our thing”, “don’t tell them”" },
  { label: "Parent undermining", quote: "“your parents sound strict”" },
  { label: "Isolation attempt", quote: "“just us two”" },
  { label: "Age-gap normalization", quote: "“not like people my age”" },
];

const thread = [
  { from: "out", text: "sure!" },
  { from: "in", text: "you’re so easy to talk to. not like people my age" },
  { from: "in", text: "what did you do after school? your parents sound strict" },
  { from: "out", text: "i guess they kinda are" },
  { from: "in", text: "you can tell me anything. this can be our thing 🙂" },
  { from: "in", text: "don’t tell them about our chats ok? they wouldn’t get it" },
];

export default function Home() {
  return (
    <main>
      {/* Fixed cut.mp4 backdrop — revealed and played once as the hero leaves,
          then frozen as the page background the content rides over. */}
      <LandingBackdrop />

      <div className="landing-fg">
        <SiteHeader active="home" />
        <LighthouseHero />
        {/* Scroll length for the pinned hero — as this scrolls past, the hero
            crossfades into the video backdrop. */}
        <div className="hero-spacer" aria-hidden="true" />

      <section className="statement-band" aria-labelledby="structural-heading">
        <div className="section-shell statement-inner">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Earlier intervention
          </div>
          <h2 id="structural-heading" className="statement-title">
            The dangerous signal is not a word. It is the shape of the
            conversation changing.
          </h2>
          <p className="statement-copy">
            LightHome watches for one-sided disclosure, recycled boundaries,
            increasing secrecy, and movement away from trusted support. It keeps
            uncertainty visible and leaves final judgment to people.
          </p>
        </div>
      </section>

      <section className="signal-section" id="method" aria-labelledby="signal-heading">
        <div className="section-shell">
          <div className="section-heading-row">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                Decision trace
              </div>
              <h2 id="signal-heading">See it on a real conversation.</h2>
            </div>
            <p>
              No flagged words — only the structural shift from friendly to
              isolating. Here is the alert, fully decomposed.
            </p>
          </div>

          <div className="demo-grid">
            {/* Liquid-glass phone — the live conversation */}
            <div className="glass-phone">
              <span className="glass-phone-notch" aria-hidden="true" />
              <div className="phone-head">
                <span className="phone-avatar">R</span>
                <div className="phone-who">
                  <strong>Riley_GG</strong>
                  <span>Met in-game · 45 min</span>
                </div>
              </div>
              <div className="phone-alert">
                <AlertTriangle size={15} aria-hidden="true" />
                Potential risk pattern detected
              </div>
              <div className="phone-thread">
                {thread.map((m, i) => (
                  <p key={i} className={`phone-bubble ${m.from}`}>
                    {m.text}
                  </p>
                ))}
              </div>
              <div className="phone-foot">
                <span className="phone-foot-urgent">Urgent</span>
                <span>Risk: 94%</span>
              </div>
            </div>

            {/* Analysis card — the decomposed decision */}
            <div className="analysis-card">
              <div className="analysis-head">
                <span className="analysis-mark">
                  <TowerControl size={18} aria-hidden="true" />
                </span>
                LightHome Analysis
              </div>

              <div className="analysis-stats">
                <div className="analysis-stat risk">
                  <strong>94%</strong>
                  <span>Risk score</span>
                </div>
                <div className="analysis-stat safe">
                  <strong>0</strong>
                  <span>Explicit words</span>
                </div>
              </div>

              <div className="analysis-stages">
                <span className="stage-chip trust">Trust</span>
                <ArrowRight size={15} aria-hidden="true" />
                <span className="stage-chip isolation">Isolation</span>
              </div>

              <div className="analysis-signals-label">Detected signals</div>
              <ul className="analysis-signals">
                {detectedSignals.map((s) => (
                  <li key={s.label}>
                    <strong>{s.label}</strong> — {s.quote}
                  </li>
                ))}
              </ul>

              <p className="analysis-summary">
                Trust → Isolation in 45 minutes with 0 explicit keywords. This
                structural shift precedes escalation. We recommend reviewing this
                conversation now.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="views-section" aria-labelledby="views-heading">
        <div className="section-shell">
          <div className="section-heading-row compact">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                Two accountable views
              </div>
              <h2 id="views-heading">The right context for the right person.</h2>
            </div>
          </div>

          <div className="view-grid">
            <Link href="/parent" className="view-panel parent-view">
              <div className="view-icon"><EyeOff size={24} /></div>
              <div>
                <span className="view-label">Parent dashboard</span>
                <h3>Guidance without exposing private messages.</h3>
                <p>
                  Stage movement, alert state, and calm next steps. Raw transcript
                  content stays out of the parent view.
                </p>
              </div>
              <span className="view-action">
                Open parent view <ArrowRight size={17} />
              </span>
            </Link>

            <Link href="/platform" className="view-panel platform-view">
              <div className="view-icon"><Users size={24} /></div>
              <div>
                <span className="view-label">Trust &amp; safety</span>
                <h3>Full context for trained human review.</h3>
                <p>
                  Transcript, feature decomposition, stage likelihoods, and alert
                  conditions in one focused moderation workspace.
                </p>
              </div>
              <span className="view-action">
                Open moderator view <ArrowRight size={17} />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <SignalAccordion />

      <section className="safety-band" aria-labelledby="safety-heading">
        <div className="section-shell safety-inner">
          <div>
            <div className="eyebrow light">
              <span className="eyebrow-dot" />
              Safety by design
            </div>
            <h2 id="safety-heading">A signal for review, never an automatic sentence.</h2>
          </div>
          <div className="safety-copy">
            <p>
              LightHome does not automatically ban, block, or report anyone. The
              prototype was built and demonstrated entirely with fictional
              conversations.
            </p>
            <Link href="/platform" className="text-link light-link">
              Inspect the decision trace <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="section-shell footer-inner">
          <div>
            <strong>LightHome</strong>
            <p>Structural conversation safety, with uncertainty left visible.</p>
          </div>
          <div className="footer-links">
            <Link href="/parent">Parent view</Link>
            <Link href="/platform">Trust &amp; safety</Link>
            <a href="#method">Method</a>
          </div>
        </div>
      </footer>
      </div>
    </main>
  );
}

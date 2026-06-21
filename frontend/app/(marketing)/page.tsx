import Link from "next/link";
import {
  ArrowRight,
  EyeOff,
  Gauge,
  Layers3,
  ShieldCheck,
  Users,
} from "lucide-react";

import { LandingBackdrop } from "@/components/LandingBackdrop";
import { LighthouseHero } from "@/components/LighthouseHero";
import { SignalAccordion } from "@/components/SignalAccordion";
import { SiteHeader } from "@/components/SiteHeader";

const stages = [
  { name: "Trust-building", value: 22, tone: "trust" },
  { name: "Isolation", value: 48, tone: "isolation" },
  { name: "Desensitization", value: 20, tone: "desensitization" },
  { name: "Escalation", value: 10, tone: "escalation" },
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
              <h2 id="signal-heading">See the transition, not just the verdict.</h2>
            </div>
            <p>
              Every alert stays decomposable: raw signals, stage probabilities,
              Bayesian movement, and the conditions that did or did not align.
            </p>
          </div>

          <div className="evidence-grid">
            <article className="evidence-panel stage-panel">
              <div className="panel-kicker">
                <Layers3 size={17} aria-hidden="true" />
                Stage probability
              </div>
              <div className="stage-bars">
                {stages.map((stage) => (
                  <div className="stage-row" key={stage.name}>
                    <div className="stage-label">
                      <span>{stage.name}</span>
                      <strong>{stage.value}%</strong>
                    </div>
                    <div className="stage-track">
                      <span
                        className={`stage-fill ${stage.tone}`}
                        style={{ width: `${stage.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="stage-note">
                <span className="status-light watch" />
                Isolation is rising, but the alert threshold is not yet met.
              </div>
            </article>

            <article className="evidence-panel trace-panel">
              <div className="trace-image" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/frames/frame_0028.webp" alt="" />
              </div>
              <div className="trace-overlay">
                <div className="panel-kicker light">
                  <Gauge size={17} aria-hidden="true" />
                  Structural movement
                </div>
                <h3>Friendly rapport is shifting toward private reliance.</h3>
                <p>
                  Directionality and disclosure asymmetry increased across the
                  last four turns. Boundary pressure appeared, receded, then
                  returned.
                </p>
              </div>
              <div className="trace-metric">
                <span>Risk movement</span>
                <strong>+18%</strong>
              </div>
            </article>

            <article className="evidence-panel conditions-panel">
              <div className="panel-kicker">
                <ShieldCheck size={17} aria-hidden="true" />
                Alert conditions
              </div>
              <div className="condition-list">
                <div><span>Harmful mass</span><strong className="met">Met</strong></div>
                <div><span>Directionality</span><strong className="met">Met</strong></div>
                <div><span>Low reciprocity</span><strong className="pending">Watching</strong></div>
                <div><span>Velocity</span><strong className="pending">Watching</strong></div>
              </div>
              <p className="condition-copy">
                LightHome alerts only when multiple independent conditions line
                up, reducing the chance that casual secrecy or ordinary praise is
                mistaken for grooming.
              </p>
            </article>
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

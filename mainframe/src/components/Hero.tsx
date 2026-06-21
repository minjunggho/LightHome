import { useEffect, useState } from 'react';
import { useTypewriter } from '../hooks/useTypewriter';

const TYPEWRITER_TEXT =
  'Glad you stopped in. Good taste tends to find us. Now, what are we building?';

const PILL_LABELS = [
  'Pitch us an idea',
  'Come work here',
  'Send a brief hello',
  'See how we operate',
];

const CONTACT_EMAIL = 'hello@mainframe.co';

const pillBase =
  'inline-flex items-center justify-center rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap transition-colors duration-200';

function CopyIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <rect x="4" y="4" width="11" height="11" rx="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function Hero() {
  const { displayed, done } = useTypewriter(TYPEWRITER_TEXT);

  // Pills fade/slide in 400ms after load, independent of the typewriter.
  const [pillsVisible, setPillsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setPillsVisible(true), 400);
    return () => clearTimeout(timeout);
  }, []);

  const handleCopy = () => {
    navigator.clipboard
      ?.writeText(CONTACT_EMAIL)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => {
        /* clipboard unavailable — ignore */
      });
  };

  return (
    <section className="relative z-[1] flex h-screen flex-col justify-end overflow-hidden px-5 pb-12 sm:px-8 md:justify-center md:px-10 md:pb-0">
      <div className="relative z-10 max-w-xl">
        {/* Blurred intro label */}
        <div
          className="mb-5 select-none sm:mb-6"
          style={{
            pointerEvents: 'none',
            fontSize: 'clamp(18px, 4vw, 26px)',
            lineHeight: 1.3,
            fontWeight: 400,
            color: '#000',
            filter: 'blur(4px)',
          }}
        >
          Hey there, meet A.R.I.A,
          <br />
          Mainframe's Adaptive Response Interface Agent
        </div>

        {/* Typewriter line */}
        <p
          className="mb-5 text-black sm:mb-6"
          style={{
            fontSize: 'clamp(18px, 4vw, 26px)',
            lineHeight: 1.35,
            fontWeight: 400,
            minHeight: '54px',
          }}
        >
          {displayed}
          {!done && (
            <span
              className="ml-[2px] inline-block h-[1.1em] w-[2px] bg-black align-middle"
              style={{ animation: 'blink 1s step-end infinite' }}
            />
          )}
        </p>

        {/* Action pills */}
        <div
          className="flex flex-wrap gap-y-1"
          style={{
            opacity: pillsVisible ? 1 : 0,
            transform: pillsVisible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
          }}
        >
          {PILL_LABELS.map((label) => (
            <button
              key={label}
              type="button"
              className={`${pillBase} border border-black/10 bg-white text-black hover:bg-black hover:text-white`}
            >
              {label}
            </button>
          ))}

          <button
            type="button"
            onClick={handleCopy}
            className={`${pillBase} gap-2 border border-white bg-transparent text-white hover:bg-white hover:text-black sm:gap-3`}
          >
            <span>
              Reach us:{' '}
              <span className="underline underline-offset-1">{CONTACT_EMAIL}</span>
            </span>
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      </div>
    </section>
  );
}

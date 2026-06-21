import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-widest text-neutral-400">
        Lighthome
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        Catching grooming by its shape, not its words.
      </h1>
      <p className="mt-4 text-lg text-neutral-600">
        Lighthome tracks a live probability distribution over the documented grooming
        arc — trust → isolation → desensitization → escalation — and alerts a parent at
        the structural shift, before anything explicit is said.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/parent"
          className="rounded-xl bg-white p-5 ring-1 ring-black/10 transition hover:ring-black/30"
        >
          <h2 className="font-semibold">Parent view →</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Probability bar, risk timeline, alert + guidance. No messages shown.
          </p>
        </Link>
        <Link
          href="/platform"
          className="rounded-xl bg-white p-5 ring-1 ring-black/10 transition hover:ring-black/30"
        >
          <h2 className="font-semibold">Trust &amp; Safety →</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Full transcript, the four alert conditions, and feature decomposition.
          </p>
        </Link>
      </div>

      <p className="mt-8 text-xs text-neutral-400">
        Demo conversations are fictional and clearly labeled. Always human-in-the-loop —
        the system never blocks, bans, or reports automatically.
      </p>
    </main>
  );
}

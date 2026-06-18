// Decorative, original (non-FIFA-logo) animated backdrop: a slowly rotating hand-drawn
// soccer ball, drifting pitch-coloured glow orbs and a faint moving wordmark. Sits behind
// everything; the rest of the UI uses translucent dark panels so this shows through.
function Ball({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill="#ffffff" fillOpacity="0.9" stroke="#0b0b0c" strokeWidth="1.5" />
      <polygon points="50,32 63,42 58,58 42,58 37,42" fill="#0b0b0c" />
      <g fill="none" stroke="#0b0b0c" strokeWidth="2.2" strokeLinecap="round">
        <path d="M50 32 L50 10" /><path d="M63 42 L83 33" /><path d="M58 58 L72 76" />
        <path d="M42 58 L28 76" /><path d="M37 42 L17 33" />
      </g>
      <g fill="#0b0b0c">
        <path d="M50 10 a40 40 0 0 1 22 9 l-9 14 z" fillOpacity="0.85" />
        <path d="M83 33 a40 40 0 0 1 5 27 l-16 -2 z" fillOpacity="0.85" />
        <path d="M72 76 a40 40 0 0 1 -22 12 l-8 -12 z" fillOpacity="0.85" />
        <path d="M28 76 a40 40 0 0 1 -16 -16 l14 -10 z" fillOpacity="0.85" />
        <path d="M17 33 a40 40 0 0 1 21 -14 l5 16 z" fillOpacity="0.85" />
      </g>
    </svg>
  );
}

export default function WorldCupBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-zinc-950">
      {/* drifting glow orbs in pitch / tournament colours */}
      <div className="wc-orb wc-drift-a absolute -left-32 -top-24 h-[42rem] w-[42rem] rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="wc-orb wc-drift-b absolute -right-40 top-1/3 h-[38rem] w-[38rem] rounded-full bg-sky-500/15 blur-3xl" />
      <div className="wc-orb wc-drift-c absolute bottom-[-12rem] left-1/3 h-[40rem] w-[40rem] rounded-full bg-violet-600/15 blur-3xl" />

      {/* rotating soccer balls */}
      <div className="wc-ball absolute right-[8%] top-[12%] h-44 w-44 opacity-[0.07]">
        <Ball className="h-full w-full" />
      </div>
      <div className="wc-ball-2 absolute left-[6%] bottom-[14%] h-64 w-64 opacity-[0.05]">
        <Ball className="h-full w-full" />
      </div>

      {/* faint drifting wordmark */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 select-none overflow-hidden">
        <div className="wc-marquee flex w-[200%] whitespace-nowrap text-[10rem] font-black leading-none tracking-tighter text-white/[0.025]">
          <span className="px-8">WORLD CUP 2026 · CANADA MEXICO USA · </span>
          <span className="px-8">WORLD CUP 2026 · CANADA MEXICO USA · </span>
        </div>
      </div>

      {/* subtle dark scrim to keep foreground readable */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/70 via-zinc-950/50 to-zinc-950/80" />
    </div>
  );
}

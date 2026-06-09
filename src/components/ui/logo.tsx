export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      style={{ flexShrink: 0, display: "block" }}
    >
      <rect width="40" height="40" rx="9" fill="var(--navy-700)" />
      <path d="M11 10 H15 V25 H30 V29 H11 Z" fill="var(--gold-400)" />
      <rect x="18" y="13" width="9" height="3.2" rx="1" fill="rgba(255,255,255,0.85)" />
      <rect x="18" y="18.5" width="6" height="3.2" rx="1" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}

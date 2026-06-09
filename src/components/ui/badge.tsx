interface BadgeProps {
  label: string;
  color: string;
  bg: string;
  dot?: boolean;
}

export function Badge({ label, color, bg, dot }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: dot ? 5 : 0,
        padding: "3px 9px",
        borderRadius: "var(--radius-full)",
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "var(--font-sans)",
        background: bg,
        color,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </span>
  );
}

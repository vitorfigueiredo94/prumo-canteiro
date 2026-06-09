export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-canvas)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}

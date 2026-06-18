import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  // Impede que a página seja embutida em iframes (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Impede MIME sniffing pelo browser
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Remove o referrer em navegações cross-origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Desabilita funcionalidades de browser desnecessárias
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS: força HTTPS por 1 ano (ativo em produção)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // CSP: restringe origens de scripts, estilos e imagens
  // 'unsafe-inline' em script-src é necessário pelo theme-init script no layout.tsx
  // data: em img-src é necessário para logos base64 e avatares
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "better-sqlite3", "nodemailer"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;

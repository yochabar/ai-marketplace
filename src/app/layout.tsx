// src/app/layout.tsx
import type { Metadata } from "next";
import { Providers } from "./providers";
import { Navbar } from "../components/ui/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentChain — AI Agents on Blockchain",
  description: "Discover, deploy and monetize ERC-8004 AI agents with verifiable on-chain reputation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          <div className="app-root">
            <Navbar />
            <main className="app-main">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

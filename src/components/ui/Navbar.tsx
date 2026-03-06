"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "../wallet/WalletButton";
import { useWebSocket } from "../../hooks";
import { useState } from "react";

const NAV = [
  { href: "/",            label: "Explore"     },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/analytics",   label: "Analytics"   },
  { href: "/dashboard",   label: "Dashboard"   },
  { href: "/deploy",      label: "Deploy"      },
];

export function Navbar() {
  const path = usePathname();
  const [block, setBlock] = useState<number|null>(null);

  const { connected } = useWebSocket(msg => {
    if (msg.type === "stats:tick" && msg.payload?.blockNumber) {
      setBlock(msg.payload.blockNumber);
    }
  });

  return (
    <nav className="navbar">
      <Link href="/" className="navbar__logo">
        <div className="navbar__logo-icon">⛓</div>
        Agent<em>Chain</em>
      </Link>

      <div className="navbar__nav">
        {NAV.map(n => (
          <Link key={n.href} href={n.href}
            className={`navbar__link ${path === n.href ? "navbar__link--active" : ""}`}>
            {n.label}
          </Link>
        ))}
      </div>

      <div style={{display:"flex",alignItems:"center",gap:14}}>
        {/* Live block indicator */}
        <div className="navbar__live">
          <span className="live-dot" style={!connected ? {background:"var(--text-3)"} : {}}/>
          {block ? `#${block.toLocaleString()}` : connected ? "Live" : "Offline"}
        </div>
        <WalletButton />
      </div>
    </nav>
  );
}

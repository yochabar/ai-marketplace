"use client";
import { DeployAgentForm } from "../../components/agents/DeployAgentForm";

export default function DeployPage() {
  return (
    <div className="page">
      <div className="container">
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h1 className="section-title">🚀 Deploy an Agent</h1>
          <p className="section-sub">
            Register your AI agent on-chain as an ERC-8004 identity.
            Your agent's registration file is stored on IPFS, metadata lives on Base.
          </p>

          {/* Info pills */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
            {[
              "⛓ ERC-8004 Standard",
              "📦 IPFS Metadata",
              "🔍 Subgraph Indexed",
              "💬 On-chain Reputation",
            ].map(t => (
              <span key={t} className="badge badge--verified" style={{ fontSize: 12, padding: "5px 12px" }}>{t}</span>
            ))}
          </div>

          <DeployAgentForm />
        </div>
      </div>
    </div>
  );
}

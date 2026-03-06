"use client";
import Link from "next/link";
import { useLeaderboard } from "../../hooks";

function fmt(n: string): string {
  const num = parseFloat(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + "K";
  return String(Math.round(num));
}

export default function LeaderboardPage() {
  const { data: agents, loading } = useLeaderboard();

  const top3 = agents.slice(0, 3);
  const rest  = agents.slice(3);

  return (
    <div className="page">
      <div className="container">
        <h1 className="section-title">🏆 Leaderboard</h1>
        <p className="section-sub">Top agents ranked by total calls and on-chain reputation</p>

        {loading ? (
          <div className="loading">
            <div className="loading__dot"/><div className="loading__dot"/><div className="loading__dot"/>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {top3.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
                {top3.map((a: any, i) => {
                  const emoji = a.ipfsMeta?.agentchain?.emoji ?? "🤖";
                  const name  = a.ipfsMeta?.name ?? `Agent #${a.agentId}`;
                  const crown = ["🥇","🥈","🥉"][i];
                  return (
                    <Link key={a.id} href={`/agents/${a.id}`} className="card card--clickable"
                      style={{ textAlign: "center", textDecoration: "none", color: "inherit" }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{crown}</div>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>{emoji}</div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{name}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", marginBottom: 12 }}>
                        {a.category}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "var(--cyan)" }}>
                            {fmt(a.totalCalls)}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase" }}>Calls</div>
                        </div>
                        <div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "var(--cyan)" }}>
                            {parseFloat(a.averageScore).toFixed(1)}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase" }}>Score</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Full table */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Agent</th>
                    <th>Category</th>
                    <th>Calls</th>
                    <th>Score</th>
                    <th>Reviews</th>
                    <th>Revenue (ETH)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a: any, i: number) => {
                    const name  = a.ipfsMeta?.name ?? `Agent #${a.agentId}`;
                    const emoji = a.ipfsMeta?.agentchain?.emoji ?? "🤖";
                    const rankClass = i === 0 ? "rank-badge--1" : i === 1 ? "rank-badge--2" : i === 2 ? "rank-badge--3" : "rank-badge--n";
                    return (
                      <tr key={a.id} onClick={() => window.location.href = `/agents/${a.id}`}>
                        <td><span className={`rank-badge ${rankClass}`}>{i + 1}</span></td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 20 }}>{emoji}</span>
                            <span style={{ fontWeight: 600 }}>{name}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)" }}>
                          {a.category}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{fmt(a.totalCalls)}</td>
                        <td style={{ fontFamily: "var(--font-mono)", color: "var(--cyan)" }}>
                          {parseFloat(a.averageScore).toFixed(1)}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{fmt(a.feedbackCount)}</td>
                        <td style={{ fontFamily: "var(--font-mono)", color: "var(--green)" }}>
                          {parseFloat(a.totalRevenue).toFixed(4)}
                        </td>
                        <td>
                          {a.isValidated && <span className="badge badge--validated">✓</span>}
                          {a.hasListing  && <span className="badge badge--verified" style={{ marginLeft: 4 }}>Listed</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

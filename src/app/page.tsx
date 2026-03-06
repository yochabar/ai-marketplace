"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAgents, useProtocolStats, useWebSocket } from "../hooks";
import { AgentCard } from "../components/agents/AgentCard";

const CATEGORIES = [
  { label: "All",              value: "" },
  { label: "📣 Marketing",     value: "📣 PR & Marketing" },
  { label: "💻 Dev",           value: "💻 Software Dev" },
  { label: "📊 Data",          value: "📊 Data Analysis" },
  { label: "✍️ Content",       value: "✍️ Content Creation" },
  { label: "🎧 Support",       value: "🎧 Customer Support" },
  { label: "🔬 Research",      value: "🔬 Research" },
  { label: "💰 Finance",       value: "💰 Finance" },
  { label: "🎨 Design",        value: "🎨 Design" },
  { label: "🌐 Translation",   value: "🌐 Translation" },
  { label: "🔐 Security",      value: "🔐 Security" },
];

const SORTS = [
  { value: "totalCalls",    label: "Most Used" },
  { value: "averageScore",  label: "Top Rated" },
  { value: "totalRevenue",  label: "Top Earning" },
  { value: "deployedAt",    label: "Newest" },
  { value: "feedbackCount", label: "Most Reviewed" },
];

function fmt(n?: string | number) {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v/1e6).toFixed(1)+"M";
  if (v >= 1_000)     return (v/1e3).toFixed(1)+"K";
  return String(Math.round(v));
}

function LiveTicker({ events }: { events: any[] }) {
  if (!events.length) return null;
  const ev = events[0];
  const label =
    ev.type === "agent:registered" ? "🆕 New agent deployed"
    : ev.type === "feed:callpaid"  ? "⚡ Call paid"
    : ev.type === "feed:feedback"  ? "💬 New feedback"
    : "📡 On-chain event";

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:10,
      background:"var(--bg-2)", border:"1px solid var(--border)",
      borderRadius:"var(--r)", padding:"9px 16px",
      fontFamily:"var(--font-mono)", fontSize:12, color:"var(--text-2)",
      marginBottom:12, animation:"fadein .3s ease",
    }}>
      <span style={{color:"var(--cyan)"}}>◉</span>
      <span>{label}</span>
      {ev.payload?.agentId && (
        <Link href={`/agents/${ev.payload.agentId}`}
          style={{color:"var(--cyan)", marginLeft:"auto"}}>
          Agent #{ev.payload.agentId} →
        </Link>
      )}
    </div>
  );
}

export default function ExplorePage() {
  const [category, setCategory] = useState("");
  const [orderBy,  setOrderBy]  = useState("totalCalls");
  const [search,   setSearch]   = useState("");
  const [searchQ,  setSearchQ]  = useState("");
  const [page,     setPage]     = useState(1);
  const [validated,setValidated]= useState(false);
  const [listed,   setListed]   = useState(false);
  const [liveEvts, setLiveEvts] = useState<any[]>([]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearchQ(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { connected } = useWebSocket((msg) => {
    const interesting = ["agent:registered","feed:callpaid","feed:feedback"];
    if (interesting.includes(msg.type)) {
      setLiveEvts(prev => [msg, ...prev].slice(0, 1));
    }
  });

  const { data, loading } = useAgents({
    page, limit: 24, orderBy,
    category:    category   || undefined,
    search:      searchQ    || undefined,
    isValidated: validated  || undefined,
    hasListing:  listed     || undefined,
  });

  const { data: stats } = useProtocolStats();
  const proto = stats?.protocolStat;

  return (
    <div className="page">
      <div className="container">

        {/* ── Hero ── */}
        <div className="hero">
          <div className="hero__eyebrow">
            <span className="live-dot" style={connected ? {} : {background:"var(--text-3)"}} />
            ERC-8004 · {connected ? "Live on Base" : "Connecting…"}
          </div>
          <h1 className="hero__title">
            AI Agents with
            <em>Verifiable Reputation</em>
          </h1>
          <p className="hero__sub">
            Discover, deploy and pay for AI agents whose every call,
            score and validation lives permanently on-chain.
          </p>
          <div className="hero__cta">
            <Link href="/deploy"      className="btn btn-primary">🚀 Deploy Agent</Link>
            <Link href="/leaderboard" className="btn btn-ghost">🏆 Leaderboard</Link>
            <Link href="/analytics"   className="btn btn-outline">📊 Analytics</Link>
          </div>

          {/* Protocol stats */}
          <div className="hero__stats">
            {[
              { val: fmt(proto?.totalAgents),     lbl: "Agents" },
              { val: fmt(proto?.totalCalls),       lbl: "Total Calls" },
              { val: fmt(proto?.totalFeedbacks),   lbl: "Feedbacks" },
              { val: fmt(proto?.totalValidations), lbl: "Validations" },
              { val: fmt(proto?.activeListings),   lbl: "Listed" },
              { val: parseFloat(proto?.totalRevenue ?? "0").toFixed(2)+" ETH", lbl: "Revenue" },
            ].map(s => (
              <div className="hstat" key={s.lbl}>
                <div className="hstat__val">{s.val ?? "—"}</div>
                <div className="hstat__lbl">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live event ticker */}
        <LiveTicker events={liveEvts} />

        {/* ── Filters ── */}
        <div className="filter-bar">
          <input
            className="filter-bar__search"
            placeholder="Search agents by name, category, tag…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="filter-lbl">Sort:</span>
          <select value={orderBy} onChange={e => { setOrderBy(e.target.value); setPage(1); }}>
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"var(--text-2)",cursor:"pointer"}}>
            <input type="checkbox" checked={validated} onChange={e => { setValidated(e.target.checked); setPage(1); }} />
            ✓ Validated
          </label>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"var(--text-2)",cursor:"pointer"}}>
            <input type="checkbox" checked={listed} onChange={e => { setListed(e.target.checked); setPage(1); }} />
            Listed
          </label>
        </div>

        {/* Category pills */}
        <div className="pills">
          {CATEGORIES.map(c => (
            <button key={c.value}
              className={`pill ${c.value === category ? "pill--active" : ""}`}
              onClick={() => { setCategory(c.value); setPage(1); }}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Result count */}
        {!loading && data && (
          <div style={{fontSize:12.5, color:"var(--text-3)", fontFamily:"var(--font-mono)", marginBottom:14}}>
            {data.total} agent{data.total !== 1 ? "s" : ""} found
            {category ? ` in ${category}` : ""}
            {searchQ ? ` matching "${searchQ}"` : ""}
          </div>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="agents-grid agents-grid--skeleton">
            {Array.from({length:12}).map((_,i) => <div key={i} className="skel" />)}
          </div>
        ) : !data?.items?.length ? (
          <div className="empty">
            <div className="empty__ic">🤖</div>
            <p style={{marginBottom:20}}>No agents match your filters.</p>
            <button className="btn btn-ghost" onClick={() => {
              setCategory(""); setSearch(""); setSearchQ(""); setValidated(false); setListed(false); setPage(1);
            }}>Clear filters</button>
          </div>
        ) : (
          <>
            <div className="agents-grid">
              {data.items.map((agent: any, i: number) => (
                <AgentCard key={agent.id} agent={agent} rank={page === 1 ? i+1 : undefined} />
              ))}
            </div>

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="pagination">
                <button className="btn btn-ghost btn-sm" disabled={page <= 1}
                  onClick={() => setPage(p => p-1)}>← Prev</button>
                <span className="pagination__info">Page {page} / {data.pages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page >= data.pages}
                  onClick={() => setPage(p => p+1)}>Next →</button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

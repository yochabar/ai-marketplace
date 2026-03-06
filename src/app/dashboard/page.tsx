"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import { useSiwe, useWebSocket } from "../../hooks";
import { api } from "../../lib/api";

/* ── helpers ── */
function fmt(n?: string | number) {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v/1e6).toFixed(1)+"M";
  if (v >= 1_000)     return (v/1e3).toFixed(1)+"K";
  return String(Math.round(v));
}
function shortAddr(a:string) { return `${a.slice(0,6)}…${a.slice(-4)}`; }

/* ── Score badge ── */
function ScoreBadge({ score }: {score:number}) {
  const color = score >= 75 ? "var(--green)" : score >= 50 ? "var(--cyan)" : score >= 25 ? "var(--amber)" : "var(--red)";
  return (
    <div style={{
      display:"flex",alignItems:"center",justifyContent:"center",
      width:38,height:38,borderRadius:9,
      background:`color-mix(in srgb, ${color} 15%, transparent)`,
      border:`1px solid color-mix(in srgb, ${color} 35%, transparent)`,
      fontFamily:"var(--font-mono)",fontWeight:800,fontSize:14,color,
    }}>
      {score.toFixed(0)}
    </div>
  );
}

/* ── Portfolio donut (simple CSS) ── */
function RevenueBreakdown({ agents }: {agents:any[]}) {
  if (!agents.length) return null;
  const total = agents.reduce((s,a) => s+parseFloat(a.totalRevenue??0), 0);
  if (total === 0) return null;
  const sorted = [...agents].sort((a,b) => parseFloat(b.totalRevenue)-parseFloat(a.totalRevenue)).slice(0,5);
  const colors = ["var(--cyan)","var(--purple)","var(--green)","var(--amber)","var(--red)"];
  return (
    <div className="card">
      <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Revenue Breakdown</div>
      {sorted.map((a,i) => {
        const pct = (parseFloat(a.totalRevenue??0)/total)*100;
        const name = a.ipfsMeta?.name ?? `Agent #${a.agentId}`;
        return (
          <div key={a.id} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
              <span style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:colors[i],display:"inline-block"}}/>
                {name}
              </span>
              <span style={{fontFamily:"var(--font-mono)",color:colors[i],fontSize:12}}>
                {pct.toFixed(1)}%
              </span>
            </div>
            <div style={{height:3,background:"var(--bg-3)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:colors[i],borderRadius:2,transition:"width .6s ease"}}/>
            </div>
          </div>
        );
      })}
      <div style={{borderTop:"1px solid var(--border)",marginTop:12,paddingTop:12,
        fontFamily:"var(--font-mono)",fontSize:12,color:"var(--text-2)"}}>
        Total: <strong style={{color:"var(--text)"}}>{total.toFixed(6)} ETH</strong>
      </div>
    </div>
  );
}

/* ── Agent row ── */
function AgentRow({ agent, onRefresh }: {agent:any; onRefresh:()=>void}) {
  const meta  = agent.ipfsMeta ?? {};
  const ac    = meta.agentchain ?? {};
  const emoji = ac.emoji ?? "🤖";
  const name  = meta.name ?? `Agent #${agent.agentId}`;
  const score = parseFloat(agent.averageScore ?? "0");

  return (
    <div className="agent-row">
      <div className="agent-row__ava">{emoji}</div>
      <div className="agent-row__info">
        <div className="agent-row__name">{name}</div>
        <div className="agent-row__cat">{agent.category}</div>
      </div>
      <ScoreBadge score={score}/>
      {[
        {v: fmt(agent.totalCalls),   l:"Calls"},
        {v: parseFloat(agent.totalRevenue??0).toFixed(4), l:"ETH"},
        {v: fmt(agent.feedbackCount), l:"Reviews"},
        {v: fmt(agent.subscriberCount), l:"Subs"},
      ].map(s => (
        <div key={s.l} className="agent-row__stat">
          <div className="agent-row__stat-v">{s.v}</div>
          <div className="agent-row__stat-l">{s.l}</div>
        </div>
      ))}
      <div className="agent-row__actions">
        {agent.isValidated && <span className="badge badge--v">✓</span>}
        {agent.hasListing  && <span className="badge badge--l">Listed</span>}
      </div>
      <div className="agent-row__actions">
        <Link href={`/agents/${agent.id}`} className="btn btn-ghost btn-sm">View →</Link>
      </div>
    </div>
  );
}

/* ── Network info pill ── */
function NetworkBar({ network }: {network:any}) {
  if (!network) return null;
  return (
    <div className="network-bar">
      <div className="nb-item">
        <label>Block</label>
        <span style={{color:"var(--cyan)"}}>#{network.blockNumber?.toLocaleString()}</span>
      </div>
      <div className="nb-item">
        <label>Gas</label>
        <span style={{color:"var(--text-2)"}}>{parseFloat(network.gasPrice??0).toFixed(3)} Gwei</span>
      </div>
      <div className="nb-item">
        <label>Network</label>
        <span style={{color:"var(--text-2)"}}>Base Sepolia</span>
      </div>
      <div className="nb-status" style={{marginLeft:"auto"}}>
        <span className="live-dot"/>
        <span style={{fontSize:12,color:"var(--green)",fontFamily:"var(--font-mono)"}}>Connected</span>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function DashboardPage() {
  const { address, isConnected }              = useAccount();
  const { data: balance }                      = useBalance({ address });
  const { token, signIn, signOut, isAuthenticated, loading: siweLoading } = useSiwe();

  const [agents,   setAgents]   = useState<any[]>([]);
  const [network,  setNetwork]  = useState<any>(null);
  const [loading,  setLoading]  = useState(false);
  const [sortBy,   setSortBy]   = useState<"totalCalls"|"averageScore"|"totalRevenue">("totalCalls");
  const [liveCount,setLiveCount]= useState(0);

  useWebSocket(msg => {
    if (msg.type === "agent:callpaid") setLiveCount(c => c+1);
  });

  const loadData = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.agents.my(token),
      api.analytics.network(),
    ]).then(([myAgents, net]) => {
      setAgents(myAgents as any[]);
      setNetwork(net);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [token]);

  /* ── Not connected ── */
  if (!isConnected) return (
    <div className="page">
      <div className="container">
        <div className="empty" style={{paddingTop:80}}>
          <div className="empty__ic">🔌</div>
          <h2 style={{marginBottom:12,fontSize:22,fontWeight:800}}>Connect your wallet</h2>
          <p style={{color:"var(--text-2)",marginBottom:24}}>
            Connect to view your deployed agents, revenue and on-chain activity.
          </p>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <Link href="/" className="btn btn-ghost">← Explore Agents</Link>
            <Link href="/deploy" className="btn btn-primary">🚀 Deploy an Agent</Link>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Not signed in ── */
  if (!isAuthenticated) return (
    <div className="page">
      <div className="container">
        <div className="empty" style={{paddingTop:80}}>
          <div className="empty__ic">🔐</div>
          <h2 style={{marginBottom:10,fontSize:22,fontWeight:800}}>Sign in to access your dashboard</h2>
          <p style={{color:"var(--text-2)",maxWidth:400,margin:"0 auto 24px",fontSize:14}}>
            Sign-In with Ethereum (SIWE) proves you own this wallet without sharing any private key.
          </p>
          <button className="btn btn-primary" onClick={signIn} disabled={siweLoading} style={{minWidth:180}}>
            {siweLoading ? "Signing…" : "Sign In with Ethereum"}
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Portfolio summary ── */
  const totalRevenue  = agents.reduce((s,a) => s+parseFloat(a.totalRevenue??0), 0);
  const totalCalls    = agents.reduce((s,a) => s+parseFloat(a.totalCalls??0), 0);
  const totalSubs     = agents.reduce((s,a) => s+parseFloat(a.subscriberCount??0), 0);
  const avgScore      = agents.length
    ? agents.reduce((s,a) => s+parseFloat(a.averageScore??0), 0)/agents.length : 0;
  const listedCount   = agents.filter(a=>a.hasListing).length;
  const validatedCount= agents.filter(a=>a.isValidated).length;

  const sorted = [...agents].sort((a,b) => parseFloat(b[sortBy]??0)-parseFloat(a[sortBy]??0));

  return (
    <div className="page">
      <div className="container">

        {/* ── Header ── */}
        <div className="dash-header">
          <div>
            <div className="dash-title">My Dashboard</div>
            <div className="dash-addr">{address}</div>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            {balance && (
              <div style={{
                background:"var(--bg-2)",border:"1px solid var(--border)",
                borderRadius:"var(--r-sm)",padding:"7px 14px",
                fontFamily:"var(--font-mono)",fontSize:13,
              }}>
                {parseFloat(formatEther(balance.value)).toFixed(4)} ETH
              </div>
            )}
            {liveCount > 0 && (
              <div style={{
                background:"var(--green-dim)",border:"1px solid rgba(34,211,160,.3)",
                borderRadius:"var(--r-sm)",padding:"7px 14px",
                fontFamily:"var(--font-mono)",fontSize:12,color:"var(--green)",
              }}>
                +{liveCount} live call{liveCount!==1?"s":""}
              </div>
            )}
            <Link href="/deploy" className="btn btn-primary">+ Deploy Agent</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => { signOut(); }}>Sign out</button>
          </div>
        </div>

        {/* ── Network bar ── */}
        <NetworkBar network={network}/>

        {/* ── KPI grid ── */}
        <div className="kpi-grid" style={{marginBottom:24}}>
          {[
            {label:"Agents Deployed",  value:String(agents.length),             color:"var(--cyan)"},
            {label:"Total Calls",      value:fmt(totalCalls),                   color:"var(--purple)"},
            {label:"Total Revenue",    value:totalRevenue.toFixed(4)+" ETH",   color:"var(--green)"},
            {label:"Avg Score",        value:avgScore.toFixed(1),               color:"var(--amber)"},
            {label:"Subscribers",      value:fmt(totalSubs),                    color:"var(--cyan)"},
            {label:"Validated",        value:`${validatedCount} / ${agents.length}`, color:"var(--green)"},
          ].map(k => (
            <div key={k.label} className="kpi">
              <div className="kpi__accent" style={{background:k.color}}/>
              <div className="kpi__label">{k.label}</div>
              <div className="kpi__value" style={{color:k.color}}>{k.value}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="spinner"><div className="spin-dot"/><div className="spin-dot"/><div className="spin-dot"/></div>
        ) : agents.length === 0 ? (
          <div className="empty" style={{paddingTop:32}}>
            <div className="empty__ic">🤖</div>
            <p style={{marginBottom:20}}>You haven't deployed any agents yet.</p>
            <Link href="/deploy" className="btn btn-primary">🚀 Deploy your first agent</Link>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:20,alignItems:"start"}}>

            {/* Agent list */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
                <h2 style={{fontWeight:700,fontSize:16}}>
                  Your Agents <span style={{fontFamily:"var(--font-mono)",fontSize:13,color:"var(--text-3)",marginLeft:6}}>{agents.length}</span>
                </h2>
                <div style={{display:"flex",gap:7,alignItems:"center"}}>
                  <span style={{fontSize:12,color:"var(--text-3)"}}>Sort:</span>
                  {([
                    {v:"totalCalls",    l:"Calls"},
                    {v:"averageScore",  l:"Score"},
                    {v:"totalRevenue",  l:"Revenue"},
                  ] as const).map(s => (
                    <button key={s.v} className={`pill ${sortBy===s.v?"pill--active":""}`}
                      style={{fontSize:11,padding:"3px 10px"}}
                      onClick={()=>setSortBy(s.v)}>
                      {s.l}
                    </button>
                  ))}
                </div>
              </div>

              {sorted.map(a => (
                <AgentRow key={a.id} agent={a} onRefresh={loadData}/>
              ))}

              {/* Quick links */}
              <div style={{
                display:"flex",gap:10,marginTop:20,
                padding:"14px 18px",background:"var(--bg-2)",
                border:"1px solid var(--border)",borderRadius:"var(--r)",flexWrap:"wrap",
              }}>
                <span style={{fontSize:13,color:"var(--text-2)"}}>Quick actions:</span>
                <Link href="/deploy"      className="btn btn-primary btn-sm">+ Deploy Agent</Link>
                <Link href="/leaderboard" className="btn btn-ghost btn-sm">🏆 Leaderboard</Link>
                <Link href="/analytics"   className="btn btn-ghost btn-sm">📊 Protocol Stats</Link>
                <a href={`https://sepolia.basescan.org/address/${address}`}
                  target="_blank" rel="noopener"
                  className="btn btn-ghost btn-sm">
                  Basescan ↗
                </a>
              </div>
            </div>

            {/* Sidebar */}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <RevenueBreakdown agents={agents}/>

              {/* Wallet info */}
              <div className="card">
                <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Wallet</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text-3)",marginBottom:6}}>Address</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:11.5,wordBreak:"break-all",marginBottom:14}}>{address}</div>
                {balance && (
                  <>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text-3)",marginBottom:4}}>Balance</div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:18,fontWeight:800,color:"var(--cyan)"}}>
                      {parseFloat(formatEther(balance.value)).toFixed(6)} ETH
                    </div>
                  </>
                )}
              </div>

              {/* Status summary */}
              <div className="card">
                <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Portfolio Health</div>
                {[
                  {label:"Listed on marketplace", val:`${listedCount} / ${agents.length}`, ok: listedCount > 0},
                  {label:"ERC-8004 Validated",    val:`${validatedCount} / ${agents.length}`, ok: validatedCount > 0},
                  {label:"Avg reputation score",  val:avgScore.toFixed(1)+"/100", ok: avgScore >= 50},
                ].map(row => (
                  <div key={row.label} style={{
                    display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"9px 0",borderBottom:"1px solid var(--border)",fontSize:13,
                  }}>
                    <span style={{color:"var(--text-2)"}}>{row.label}</span>
                    <span style={{
                      fontFamily:"var(--font-mono)",fontSize:12,fontWeight:700,
                      color: row.ok ? "var(--green)" : "var(--amber)",
                    }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

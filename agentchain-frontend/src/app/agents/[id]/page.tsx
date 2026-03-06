"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount, useChainId } from "wagmi";
import { parseEther, formatEther } from "viem";
import { useAgent, usePayForCall, useSiwe, useWebSocket } from "../../../hooks";
import { getContracts } from "../../../lib/wagmi";

/* ── helpers ── */
function fmt(n?: string | number) {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v/1e6).toFixed(1)+"M";
  if (v >= 1_000)     return (v/1e3).toFixed(1)+"K";
  return String(Math.round(v));
}
function shortAddr(a: string) { return `${a.slice(0,6)}…${a.slice(-4)}`; }
function timeAgo(ts: string) {
  const s = Math.floor(Date.now()/1000) - parseInt(ts);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400)return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

/* ── Score ring ── */
function ScoreRing({ score }: { score: number }) {
  const pct  = Math.min(100, Math.max(0, score));
  const r    = 38;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 75 ? "var(--green)" : pct >= 50 ? "var(--cyan)" : pct >= 25 ? "var(--amber)" : "var(--red)";
  return (
    <div style={{position:"relative",width:96,height:96,flexShrink:0}}>
      <svg width="96" height="96" style={{transform:"rotate(-90deg)"}}>
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--bg-3)" strokeWidth="7"/>
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{transition:"stroke-dasharray .8s ease"}}/>
      </svg>
      <div style={{
        position:"absolute", inset:0, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
      }}>
        <span style={{fontFamily:"var(--font-mono)", fontSize:18, fontWeight:800, color}}>{pct.toFixed(0)}</span>
        <span style={{fontSize:9, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:".5px"}}>score</span>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function AgentDetailPage() {
  const { id }       = useParams<{id:string}>();
  const router       = useRouter();
  const { data: agent, loading } = useAgent(id);
  const { isConnected }          = useAccount();
  const chainId                  = useChainId();
  const { pay }                  = usePayForCall();
  const { token, signIn, isAuthenticated } = useSiwe();

  const [tab,     setTab]     = useState<"overview"|"feedbacks"|"validations"|"history">("overview");
  const [payState,setPayState]= useState<"idle"|"signing"|"pending"|"done"|"error">("idle");
  const [liveFeed,setLiveFeed]= useState<any[]>([]);
  const [copied,  setCopied]  = useState(false);

  // Subscribe to live events for this agent
  const { subscribe } = useWebSocket((msg) => {
    if (msg.payload?.agentId === id) {
      setLiveFeed(prev => [msg, ...prev].slice(0,6));
    }
  });
  useEffect(() => { if (id) subscribe(id); }, [id]);

  const copyGlobalId = () => {
    navigator.clipboard.writeText(agent?.globalId ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading) return (
    <div className="page"><div className="container">
      <div className="spinner"><div className="spin-dot"/><div className="spin-dot"/><div className="spin-dot"/></div>
    </div></div>
  );
  if (!agent) return (
    <div className="page"><div className="container">
      <div className="empty">
        <div className="empty__ic">❓</div>
        <p style={{marginBottom:16}}>Agent not found</p>
        <Link href="/" className="btn btn-ghost">← Back to Explore</Link>
      </div>
    </div></div>
  );

  const meta     = (agent as any).ipfsMeta ?? {};
  const ac       = meta.agentchain ?? {};
  const emoji    = ac.emoji ?? "🤖";
  const name     = meta.name ?? `Agent #${agent.agentId}`;
  const desc     = meta.description ?? "No description provided.";
  const tags     = ac.tags ?? [];
  const caps     = ac.capabilities ?? [];
  const tasks    = ac.topTasks ?? [];
  const listing  = agent.listing;
  const price    = listing ? parseFloat((listing as any).pricePerCall ?? "0") : 0;
  const score    = parseFloat(agent.averageScore ?? "0");
  const feedbacks   = (agent as any).feedbacks ?? [];
  const validations = (agent as any).validationRequests ?? [];
  const transfers   = (agent as any).transfers ?? [];
  const services    = meta.services ?? [];

  const handlePay = async () => {
    if (!isConnected) return;
    if (!isAuthenticated) { await signIn().catch(() => {}); return; }
    setPayState("signing");
    try {
      const priceWei  = parseEther(price.toString());
      const deadline  = BigInt(Math.floor(Date.now()/1000) + 3600);
      setPayState("pending");
      await pay(BigInt(agent.agentId), priceWei, "0x" as `0x${string}`, deadline);
      setPayState("done");
      setTimeout(() => setPayState("idle"), 3000);
    } catch { setPayState("error"); setTimeout(() => setPayState("idle"), 2500); }
  };

  const payLabel =
    payState === "signing"  ? "⏳ Awaiting signature…"
    : payState === "pending"? "⛓ Confirming…"
    : payState === "done"   ? "✓ Done!"
    : payState === "error"  ? "✗ Failed"
    : isConnected ? `⚡ Pay ${price > 0 ? price.toFixed(4)+" ETH" : "Free"}` : "Connect Wallet";

  return (
    <div className="page">
      <div className="container">

        {/* Breadcrumb */}
        <div style={{fontSize:12.5, color:"var(--text-3)", marginBottom:20, fontFamily:"var(--font-mono)"}}>
          <Link href="/" style={{color:"var(--text-3)"}}>Explore</Link>
          <span style={{margin:"0 8px"}}>/</span>
          <span style={{color:"var(--text-2)"}}>{name}</span>
        </div>

        {/* ── Agent Hero ── */}
        <div className="ad-hero">
          {/* Left: identity */}
          <div className="ad-ava">{emoji}</div>
          <div style={{flex:1}}>
            <div className="ad-title">{name}</div>
            <div className="ad-gid">
              {agent.globalId}
              <button onClick={copyGlobalId} style={{
                background:"none", border:"none", color:"var(--cyan)", cursor:"pointer",
                fontFamily:"var(--font-mono)", fontSize:11, marginLeft:8,
              }}>{copied ? "✓ copied" : "copy"}</button>
            </div>
            <div className="ad-badges">
              <span className="badge badge--l">{agent.category}</span>
              {agent.isValidated && <span className="badge badge--v">✓ ERC-8004 Validated</span>}
              {(listing as any)?.listed && <span className="badge badge--h">Listed</span>}
              {meta.x402Support  && <span className="badge badge--p">x402</span>}
            </div>
            <p className="ad-desc">{desc}</p>
            {tags.length > 0 && (
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>
                {tags.map((t:string) => (
                  <span key={t} style={{
                    padding:"3px 9px", borderRadius:4,
                    background:"var(--bg-3)", border:"1px solid var(--border)",
                    fontSize:11.5, color:"var(--text-2)", fontFamily:"var(--font-mono)",
                  }}>{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Right: score + action */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <ScoreRing score={score} />
            <div className="action-panel">
              {(listing as any)?.listed ? (
                <>
                  <div className="action-panel__price-lbl">Price per call</div>
                  <div className="action-panel__price-val">
                    {price > 0 ? `${price.toFixed(4)} ETH` : "Free"}
                  </div>
                  <button className="btn btn-primary btn-full"
                    style={{marginBottom:8}}
                    disabled={payState !== "idle" || !isConnected}
                    onClick={handlePay}>
                    {payLabel}
                  </button>
                  {services.length > 0 && (
                    <div style={{marginTop:12, borderTop:"1px solid var(--border)", paddingTop:12}}>
                      {services.map((s:any) => (
                        <a key={s.name} href={s.endpoint} target="_blank" rel="noopener"
                          className="btn btn-ghost btn-sm btn-full"
                          style={{marginBottom:6, justifyContent:"flex-start", textDecoration:"none"}}>
                          🔗 {s.name} {s.version ? `(${s.version})` : ""}
                        </a>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="action-panel__free">
                  <div className="action-panel__free-icon">🔒</div>
                  <div style={{fontSize:13, color:"var(--text-2)"}}>Not listed on marketplace</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live feed banner */}
        {liveFeed.length > 0 && (
          <div style={{
            background:"var(--bg-2)", border:"1px solid var(--border)",
            borderRadius:"var(--r)", padding:"10px 16px", marginBottom:22,
            fontFamily:"var(--font-mono)", fontSize:11.5,
            display:"flex", alignItems:"center", gap:10, color:"var(--text-2)",
            animation:"fadein .3s ease",
          }}>
            <span className="live-dot" />
            {liveFeed[0].type === "agent:callpaid"  && `⚡ Call paid — ${shortAddr(liveFeed[0].payload.caller)}`}
            {liveFeed[0].type === "agent:feedback"  && `💬 New feedback · score ${liveFeed[0].payload.value}`}
            {liveFeed[0].type === "agent:validation:recorded" && `🔬 Validation ${liveFeed[0].payload.status}`}
          </div>
        )}

        {/* ── Metrics ── */}
        <div className="ad-metrics">
          {[
            { val: fmt(agent.totalCalls),                          lbl: "Total Calls"    },
            { val: fmt(agent.feedbackCount),                       lbl: "Feedbacks"      },
            { val: fmt(agent.validationCount),                     lbl: "Validations"    },
            { val: parseFloat(agent.totalRevenue ?? "0").toFixed(4)+" ETH", lbl: "Revenue" },
            { val: fmt(agent.subscriberCount),                     lbl: "Subscribers"   },
            { val: new Date(parseInt(agent.deployedAt ?? "0")*1000).toLocaleDateString(), lbl: "Deployed" },
          ].map(m => (
            <div key={m.lbl} className="metric">
              <div className="metric__val">{m.val}</div>
              <div className="metric__lbl">{m.lbl}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="tabs">
          {([
            { key:"overview",    label:"Overview"    },
            { key:"feedbacks",   label:"Feedbacks",   count: feedbacks.length },
            { key:"validations", label:"Validations", count: validations.length },
            { key:"history",     label:"Transfers",   count: transfers.length },
          ] as const).map(t => (
            <button key={t.key}
              className={`tab ${tab === t.key ? "tab--active" : ""}`}
              onClick={() => setTab(t.key as any)}>
              {t.label}
              {"count" in t && <span className="tab__count">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* ── Tab: Overview ── */}
        {tab === "overview" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
            {caps.length > 0 && (
              <div className="card">
                <div style={{fontWeight:700, marginBottom:14, fontSize:14}}>Capabilities</div>
                <div className="cap-grid">
                  {caps.map((c:string) => (
                    <span key={c} className="cap-tag cap-tag--sel">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {tasks.length > 0 && (
              <div className="card">
                <div style={{fontWeight:700, marginBottom:14, fontSize:14}}>Top Tasks</div>
                {tasks.map((t:string, i:number) => (
                  <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--cyan)",minWidth:22}}>
                      {String(i+1).padStart(2,"0")}
                    </span>
                    <span style={{fontSize:13.5}}>{t}</span>
                  </div>
                ))}
              </div>
            )}

            {/* On-chain info */}
            <div className="card" style={{gridColumn:"1 / -1"}}>
              <div style={{fontWeight:700, marginBottom:14, fontSize:14}}>On-Chain Identity</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px,1fr))",gap:14}}>
                {[
                  {k:"Global ID",    v:agent.globalId},
                  {k:"Owner",        v:agent.owner},
                  {k:"Agent ID",     v:String(agent.agentId)},
                  {k:"Standard",     v:"ERC-8004"},
                  {k:"Network",      v:ac.network ?? "Base"},
                  {k:"Agent URI",    v:agent.agentURI},
                ].map(r => (
                  <div key={r.k}>
                    <div style={{fontSize:10.5,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:4}}>{r.k}</div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:11.5,wordBreak:"break-all",color:"var(--text-2)"}}>{r.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata entries */}
            {(agent as any).metadataEntries?.length > 0 && (
              <div className="card" style={{gridColumn:"1 / -1"}}>
                <div style={{fontWeight:700,marginBottom:14,fontSize:14}}>On-Chain Metadata</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px,1fr))",gap:10}}>
                  {(agent as any).metadataEntries.map((m:any) => (
                    <div key={m.metadataKey} style={{
                      background:"var(--bg-3)", border:"1px solid var(--border)",
                      borderRadius:"var(--r-sm)", padding:"10px 12px",
                    }}>
                      <div style={{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--cyan)",marginBottom:4,textTransform:"uppercase"}}>{m.metadataKey}</div>
                      <div style={{fontFamily:"var(--font-mono)",fontSize:11.5,wordBreak:"break-all"}}>{m.metadataValue}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Feedbacks ── */}
        {tab === "feedbacks" && (
          <div>
            {/* Summary header */}
            <div style={{
              display:"flex",gap:20,alignItems:"center",
              background:"var(--bg-2)",border:"1px solid var(--border)",
              borderRadius:"var(--r)",padding:"14px 18px",marginBottom:18,
              flexWrap:"wrap",
            }}>
              <ScoreRing score={score} />
              <div>
                <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>
                  {score.toFixed(1)} <span style={{fontSize:14,color:"var(--text-2)",fontWeight:400}}>/ 100</span>
                </div>
                <div style={{fontSize:13,color:"var(--text-2)"}}>
                  Based on <strong style={{color:"var(--text)"}}>{fmt(agent.feedbackCount)}</strong> verified on-chain feedbacks
                </div>
                <div style={{fontSize:11.5,color:"var(--text-3)",fontFamily:"var(--font-mono)",marginTop:4}}>
                  {feedbacks.filter((f:any)=>!f.isRevoked).length} active · {feedbacks.filter((f:any)=>f.isRevoked).length} revoked
                </div>
              </div>
            </div>

            {feedbacks.length === 0 ? (
              <div className="empty"><div className="empty__ic">💬</div><p>No feedback yet</p></div>
            ) : feedbacks.map((f:any) => (
              <div key={f.id} className={`fb-item ${f.isRevoked ? "fb-item--revoked" : ""}`}>
                <div className="fb-score">{parseFloat(f.normalisedScore ?? "0").toFixed(0)}</div>
                <div className="fb-body">
                  <div className="fb-addr">{f.clientAddress}</div>
                  <div className="fb-tags">
                    {f.tag1 && <span className="fb-tag">{f.tag1}</span>}
                    {f.tag2 && <span className="fb-tag">{f.tag2}</span>}
                    {f.isRevoked && <span className="fb-tag fb-tag--revoked">revoked</span>}
                  </div>
                  {f.feedbackURI && (
                    <a href={f.feedbackURI} target="_blank" rel="noopener"
                      style={{fontSize:11,color:"var(--cyan)",display:"block",marginTop:5}}>
                      View details ↗
                    </a>
                  )}
                </div>
                <div className="fb-ts">{timeAgo(f.timestamp)}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Validations ── */}
        {tab === "validations" && (
          <div>
            <div style={{
              display:"flex",gap:18,alignItems:"center",
              background:"var(--bg-2)",border:"1px solid var(--border)",
              borderRadius:"var(--r)",padding:"14px 18px",marginBottom:18,
              flexWrap:"wrap",
            }}>
              <div style={{
                width:60,height:60,borderRadius:14,
                background: agent.isValidated ? "var(--green-dim)" : "var(--bg-3)",
                border:`1px solid ${agent.isValidated ? "rgba(34,211,160,.3)" : "var(--border)"}`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,
              }}>
                {agent.isValidated ? "✓" : "○"}
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>
                  {agent.isValidated ? "Agent Validated" : "Not Yet Validated"}
                </div>
                <div style={{fontSize:13,color:"var(--text-2)"}}>
                  {agent.validatedCount} successful · {agent.validationCount} total requests
                </div>
              </div>
            </div>

            {validations.length === 0 ? (
              <div className="empty"><div className="empty__ic">🔬</div><p>No validation requests yet</p></div>
            ) : validations.map((v:any) => (
              <div key={v.requestId} className="vr-item">
                <div>
                  <div className="vr-model">{v.trustModel}</div>
                  {v.validator && (
                    <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text-3)",marginTop:4}}>
                      Validator: {shortAddr(v.validator)}
                    </div>
                  )}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  {v.validatorScore != null && (
                    <span style={{fontFamily:"var(--font-mono)",fontSize:13,color:"var(--cyan)"}}>
                      Score: {v.validatorScore}
                    </span>
                  )}
                  <span className={`vr-status--${v.status}`} style={{fontWeight:700,fontSize:13}}>
                    {v.status}
                  </span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text-3)"}}>
                    {timeAgo(v.requestedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: History ── */}
        {tab === "history" && (
          <div>
            {transfers.length === 0 ? (
              <div className="empty"><div className="empty__ic">🔄</div><p>No transfers recorded</p></div>
            ) : transfers.map((t:any) => (
              <div key={t.txHash} style={{
                display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"12px 16px",background:"var(--bg-2)",border:"1px solid var(--border)",
                borderRadius:"var(--r-sm)",marginBottom:8,gap:12,flexWrap:"wrap",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:16}}>→</span>
                  <div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:12,color:"var(--text-2)"}}>
                      {shortAddr(t.from)} → {shortAddr(t.to)}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text-3)"}}>
                    {timeAgo(t.timestamp)}
                  </span>
                  <a href={`https://sepolia.basescan.org/tx/${t.txHash}`}
                    target="_blank" rel="noopener"
                    style={{color:"var(--cyan)",fontSize:12,fontFamily:"var(--font-mono)"}}>
                    tx ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useProtocolStats, useWebSocket } from "../../hooks";
import { api } from "../../lib/api";

/* ── helpers ── */
function fmt(n?: string | number) {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v/1e6).toFixed(1)+"M";
  if (v >= 1_000)     return (v/1e3).toFixed(1)+"K";
  return String(Math.round(v));
}

/* ── Sparkline SVG ── */
function Sparkline({ data, color="var(--cyan)", h=40, w=120 }: {
  data: number[]; color?: string; h?: number; w?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v,i) => {
    const x = (i / (data.length-1)) * w;
    const y = h - (v/max) * (h-2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const fillPts = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg width={w} height={h} style={{display:"block",overflow:"visible"}}>
      <defs>
        <linearGradient id={`sg${color.replace(/[^a-z]/gi,"")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#sg${color.replace(/[^a-z]/gi,"")})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Bar chart column ── */
function BarChart({ data, color="var(--cyan)", max: maxOvr }: {
  data: {label:string; val:number; sub?:string}[];
  color?: string; max?: number;
}) {
  const max = maxOvr ?? Math.max(...data.map(d=>d.val), 1);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:3,height:88}}>
      {data.map((d,i) => {
        const h = Math.max(3, (d.val/max)*82);
        return (
          <div key={i} title={`${d.label}: ${d.val}`}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                    justifyContent:"flex-end",height:88,minWidth:4,cursor:"pointer",gap:2}}>
            <div style={{
              width:"100%",height:h,background:color,
              borderRadius:"2px 2px 0 0",opacity:.75,
              transition:"height .4s ease, opacity .2s",
            }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.opacity="1";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.opacity=".75";}}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ── Category bar row ── */
function CatRow({ label, val, max, total, color="var(--cyan)" }: {
  label:string; val:number; max:number; total:number; color?:string;
}) {
  const pct = max > 0 ? (val/max)*100 : 0;
  const share = total > 0 ? ((val/total)*100).toFixed(1) : "0";
  return (
    <div className="cat-row">
      <div className="cat-row__head">
        <span className="cat-row__label">{label}</span>
        <span style={{display:"flex",gap:12}}>
          <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text-3)"}}>{share}%</span>
          <span className="cat-row__val" style={{color}}>{fmt(val)}</span>
        </span>
      </div>
      <div className="cat-row__track">
        <div className="cat-row__fill" style={{width:`${pct}%`, background:color}}/>
      </div>
    </div>
  );
}

/* ── KPI card ── */
function KPI({ label, value, delta, color="var(--cyan)", spark }: {
  label:string; value:string; delta?:string; color?:string; spark?:number[];
}) {
  return (
    <div className="kpi">
      <div className="kpi__accent" style={{background:color}}/>
      <div className="kpi__label">{label}</div>
      <div className="kpi__value" style={{color}}>{value}</div>
      {delta && <div className="kpi__delta">↑ {delta}</div>}
      {spark && spark.length > 1 && (
        <div className="kpi__spark">
          <Sparkline data={spark} color={color} h={32} w={88}/>
        </div>
      )}
    </div>
  );
}

/* ── Live events sidebar ── */
function LivePanel({ events }: {events:any[]}) {
  return (
    <div className="card" style={{height:"fit-content"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <span className="live-dot"/>
        <span style={{fontSize:12.5,fontWeight:700}}>Live Events</span>
      </div>
      {events.length === 0 ? (
        <div style={{fontSize:12,color:"var(--text-3)",fontFamily:"var(--font-mono)"}}>
          Waiting for on-chain events…
        </div>
      ) : events.map((e,i) => {
        const icon = e.type.includes("callpaid") ? "⚡"
          : e.type.includes("feedback") ? "💬"
          : e.type.includes("registered") ? "🆕"
          : e.type.includes("validation") ? "🔬"
          : "📡";
        const label = e.type.replace(/agent:|feed:/g,"").replace(/:/g," ");
        return (
          <div key={i} style={{
            padding:"8px 0",borderBottom:"1px solid var(--border)",
            fontFamily:"var(--font-mono)",fontSize:11,
            opacity:1-i*0.15, animation:i===0?"fadein .3s ease":undefined,
          }}>
            <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:3}}>
              <span>{icon}</span>
              <span style={{color:"var(--cyan)"}}>{label}</span>
            </div>
            {e.payload?.agentId && (
              <Link href={`/agents/${e.payload.agentId}`}
                style={{color:"var(--text-3)"}}>
                Agent #{e.payload.agentId}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main ── */
export default function AnalyticsPage() {
  const { data: stats, loading } = useProtocolStats();
  const [daily,    setDaily]    = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [days,     setDays]     = useState(30);
  const [catMode,  setCatMode]  = useState<"calls"|"revenue"|"agents">("calls");
  const [liveEvts, setLiveEvts] = useState<any[]>([]);

  useWebSocket(msg => {
    const interesting = ["agent:registered","feed:callpaid","feed:feedback","agent:validation:recorded"];
    if (interesting.some(t => msg.type === t)) {
      setLiveEvts(prev => [msg, ...prev].slice(0,10));
    }
  });

  useEffect(() => {
    api.analytics.daily(days).then((d:any) => setDaily(d)).catch(()=>{});
    api.analytics.recentPayments(15).then((d:any) => setPayments(d)).catch(()=>{});
  }, [days]);

  const proto = stats?.protocolStat;
  const cats  = stats?.categoryStats ?? [];

  // Build time-series arrays
  const callSeries  = daily.map((d:any) => Number(d.dailyCalls ?? 0));
  const revSeries   = daily.map((d:any) => Number(d.dailyRevenue ?? 0));
  const agentSeries = daily.map((d:any) => Number(d.newAgents ?? 0));
  const subSeries   = daily.map((d:any) => Number(d.newSubscriptions ?? 0));
  const fbSeries    = daily.map((d:any) => Number(d.newFeedbacks ?? 0));

  const maxCat = Math.max(...cats.map((c:any) => Number(c[catMode === "calls" ? "totalCalls" : catMode === "revenue" ? "totalRevenue" : "agentCount"] ?? 0)), 1);
  const totalCat = cats.reduce((s:number,c:any) => s + Number(c[catMode === "calls" ? "totalCalls" : catMode === "revenue" ? "totalRevenue" : "agentCount"] ?? 0), 0);

  // Bar chart — last 30 days calls
  const barData = daily.slice(-30).map((d:any) => ({
    label: d.date,
    val:   Number(d.dailyCalls ?? 0),
  }));

  return (
    <div className="page">
      <div className="container">
        <div className="section-hd">
          <h1 className="section-title">📊 Analytics</h1>
          <p className="section-sub">Real-time protocol metrics indexed from on-chain events via The Graph</p>
        </div>

        {/* Time range + layout */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",gap:7}}>
            {[7,14,30,90].map(d => (
              <button key={d} className={`pill ${days===d?"pill--active":""}`}
                onClick={()=>setDays(d)}>{d}d</button>
            ))}
          </div>
          <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text-3)"}}>
            Subgraph · Base Sepolia
          </div>
        </div>

        {loading ? (
          <div className="spinner"><div className="spin-dot"/><div className="spin-dot"/><div className="spin-dot"/></div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:20,alignItems:"start"}}>

            {/* Main column */}
            <div>
              {/* KPI row */}
              <div className="kpi-grid">
                <KPI label="Total Agents"    value={fmt(proto?.totalAgents)}    color="var(--cyan)"   spark={agentSeries} delta={`+${agentSeries.reduce((a,b)=>a+b,0)} this period`}/>
                <KPI label="Total Calls"     value={fmt(proto?.totalCalls)}     color="var(--purple)" spark={callSeries}  delta={`+${fmt(callSeries.reduce((a,b)=>a+b,0))} this period`}/>
                <KPI label="Total Revenue"   value={revSeries.reduce((a,b)=>a+b,0).toFixed(4)+" ETH"} color="var(--green)"  spark={revSeries}/>
                <KPI label="Feedbacks"       value={fmt(proto?.totalFeedbacks)} color="var(--amber)"  spark={fbSeries}/>
                <KPI label="Validations"     value={fmt(proto?.totalValidations)} color="var(--cyan)"/>
                <KPI label="Active Listings" value={fmt(proto?.activeListings)} color="var(--purple)"/>
              </div>

              {/* Bar chart */}
              {barData.length > 0 && (
                <div className="card" style={{marginBottom:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <div style={{fontWeight:700,fontSize:14}}>Daily Calls — last {Math.min(30,days)}d</div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text-3)"}}>
                      {barData.reduce((s,d)=>s+d.val,0).toLocaleString()} total
                    </div>
                  </div>
                  <BarChart data={barData} />
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontFamily:"var(--font-mono)",fontSize:10,color:"var(--text-3)"}}>
                    <span>{barData[0]?.label ?? ""}</span>
                    <span>{barData[barData.length-1]?.label ?? ""}</span>
                  </div>
                </div>
              )}

              {/* Sparkline row */}
              {daily.length > 1 && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
                  {[
                    {label:"New Agents / day",    data:agentSeries, color:"var(--cyan)"},
                    {label:"Revenue ETH / day",   data:revSeries,   color:"var(--green)"},
                    {label:"Feedbacks / day",      data:fbSeries,    color:"var(--amber)"},
                    {label:"Subscriptions / day",  data:subSeries,   color:"var(--purple)"},
                  ].map(s => (
                    <div key={s.label} className="card" style={{padding:"14px 16px"}}>
                      <div style={{fontSize:11.5,color:"var(--text-2)",marginBottom:8}}>{s.label}</div>
                      <Sparkline data={s.data} color={s.color} h={44} w={220}/>
                    </div>
                  ))}
                </div>
              )}

              {/* Categories */}
              <div className="card" style={{marginBottom:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:14}}>Categories</div>
                  <div style={{display:"flex",gap:6}}>
                    {(["calls","revenue","agents"] as const).map(m => (
                      <button key={m} className={`pill ${catMode===m?"pill--active":""}`}
                        style={{padding:"3px 10px",fontSize:11}}
                        onClick={()=>setCatMode(m)}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                {[...cats].sort((a:any,b:any) => {
                  const k = catMode==="calls"?"totalCalls":catMode==="revenue"?"totalRevenue":"agentCount";
                  return Number(b[k]??0)-Number(a[k]??0);
                }).slice(0,10).map((c:any) => {
                  const k = catMode==="calls"?"totalCalls":catMode==="revenue"?"totalRevenue":"agentCount";
                  const col = catMode==="revenue"?"var(--green)":catMode==="agents"?"var(--purple)":"var(--cyan)";
                  return (
                    <CatRow key={c.id} label={c.category}
                      val={Number(c[k]??0)} max={maxCat} total={totalCat} color={col}/>
                  );
                })}
              </div>

              {/* Recent payments */}
              {payments.length > 0 && (
                <div className="card" style={{padding:0,overflow:"hidden"}}>
                  <div style={{padding:"16px 18px",fontWeight:700,fontSize:14,borderBottom:"1px solid var(--border)"}}>
                    Recent On-Chain Payments
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Agent</th><th>Caller</th><th>Amount (ETH)</th><th>Time</th><th>Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p:any) => (
                        <tr key={p.id} onClick={() => window.location.href=`/agents/${p.agent?.id}`}>
                          <td>
                            <Link href={`/agents/${p.agent?.id}`}
                              style={{color:"var(--cyan)",textDecoration:"none",fontFamily:"var(--font-mono)",fontSize:12}}>
                              #{p.agent?.id}
                            </Link>
                          </td>
                          <td style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text-3)"}}>
                            {p.caller?.slice(0,8)}…
                          </td>
                          <td style={{fontFamily:"var(--font-mono)",color:"var(--green)"}}>
                            {parseFloat(p.amount).toFixed(6)}
                          </td>
                          <td style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text-3)"}}>
                            {new Date(parseInt(p.timestamp)*1000).toLocaleString()}
                          </td>
                          <td>
                            <a href={`https://sepolia.basescan.org/tx/${p.txHash}`}
                              target="_blank" rel="noopener"
                              style={{color:"var(--cyan)",fontSize:12}}>↗</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <LivePanel events={liveEvts}/>

          </div>
        )}
      </div>
    </div>
  );
}

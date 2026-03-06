"use client";
import Link from "next/link";

interface Agent {
  id: string; agentId: string; agentURI: string; category: string;
  isValidated: boolean; averageScore: string; totalCalls: string;
  totalRevenue: string; feedbackCount: string; hasListing: boolean;
  deployedAt?: string;
  listing?: { pricePerCall: string; pricePerMonth: string; acceptsETH: boolean };
  ipfsMeta?: {
    name?: string; description?: string;
    agentchain?: { emoji?: string; tags?: string[]; capabilities?: string[]; pricingModel?: string };
    x402Support?: boolean;
  };
}

function fmt(n: string | number | undefined): string {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v/1e6).toFixed(1)+"M";
  if (v >= 1_000)     return (v/1e3).toFixed(1)+"K";
  return String(Math.round(v));
}

function ScoreBar({ score }: {score: number}) {
  const color = score >= 75 ? "var(--green)" : score >= 50 ? "var(--cyan)" : score >= 25 ? "var(--amber)" : "var(--red)";
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{
        flex:1,height:3,background:"var(--bg-3)",borderRadius:2,overflow:"hidden",
      }}>
        <div style={{
          height:"100%",width:`${Math.min(100,score)}%`,background:color,
          borderRadius:2,transition:"width .6s ease",
        }}/>
      </div>
      <span style={{fontFamily:"var(--font-mono)",fontSize:11,color,minWidth:24,textAlign:"right"}}>
        {score.toFixed(0)}
      </span>
    </div>
  );
}

export function AgentCard({ agent, rank }: { agent: Agent; rank?: number }) {
  const meta  = agent.ipfsMeta;
  const ac    = meta?.agentchain;
  const emoji = ac?.emoji ?? "🤖";
  const name  = meta?.name ?? `Agent #${agent.agentId}`;
  const desc  = meta?.description ?? "";
  const tags  = (ac?.tags ?? []).slice(0,3);
  const score = parseFloat(agent.averageScore ?? "0");
  const price = agent.listing?.pricePerCall;
  const isHot = rank !== undefined && rank <= 3;

  return (
    <Link href={`/agents/${agent.id}`} className="ac">
      <div className="ac__stripe"/>

      {/* Head */}
      <div className="ac__head">
        <div className="ac__ava">{emoji}</div>
        <div className="ac__badges">
          {isHot && <span className="badge badge--h">#{rank}</span>}
          {agent.isValidated && <span className="badge badge--v">✓</span>}
          {agent.hasListing  && <span className="badge badge--l">Listed</span>}
          {meta?.x402Support && <span className="badge badge--p">x402</span>}
        </div>
      </div>

      {/* Identity */}
      <div>
        <div className="ac__name">{name}</div>
        <div className="ac__cat">{agent.category}</div>
      </div>

      {/* Description */}
      {desc && <div className="ac__desc">{desc}</div>}

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {tags.map(t => (
            <span key={t} style={{
              padding:"2px 7px",borderRadius:4,
              background:"var(--bg-3)",border:"1px solid var(--border)",
              fontSize:10.5,color:"var(--text-2)",fontFamily:"var(--font-mono)",
            }}>{t}</span>
          ))}
        </div>
      )}

      {/* Stats grid */}
      <div className="ac__stats">
        <div className="ac__stat">
          <div className="ac__sv">{fmt(agent.totalCalls)}</div>
          <div className="ac__sl">Calls</div>
        </div>
        <div className="ac__stat">
          <div className="ac__sv">{fmt(agent.feedbackCount)}</div>
          <div className="ac__sl">Reviews</div>
        </div>
        <div className="ac__stat">
          <div className="ac__sv">{parseFloat(agent.totalRevenue ?? "0").toFixed(3)}</div>
          <div className="ac__sl">ETH earned</div>
        </div>
      </div>

      {/* Score bar */}
      <div>
        <div style={{fontSize:10.5,color:"var(--text-3)",marginBottom:4,
                     fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".5px"}}>
          Reputation
        </div>
        <ScoreBar score={score}/>
      </div>

      {/* Footer */}
      <div className="ac__foot">
        <div className="ac__price">
          {price && parseFloat(price) > 0
            ? <><strong>{parseFloat(price).toFixed(4)} ETH</strong> / call</>
            : agent.hasListing ? "Free" : <span style={{color:"var(--text-3)"}}>Not listed</span>}
        </div>
        <div style={{fontFamily:"var(--font-mono)",fontSize:9.5,color:"var(--text-3)"}}>
          ERC-8004
        </div>
      </div>
    </Link>
  );
}

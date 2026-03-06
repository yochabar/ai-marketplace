"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useDeployAgent, useSiwe } from "../../hooks";

const CATEGORIES = [
  "📣 PR & Marketing", "💻 Software Dev", "📊 Data Analysis",
  "✍️ Content Creation", "🎧 Customer Support", "🔬 Research",
  "💰 Finance", "🎨 Design", "🌐 Translation", "🔐 Security",
];

const CAPABILITIES = [
  "Natural Language", "Code Generation", "Data Analysis", "Image Understanding",
  "Web Search", "API Integration", "Multilingual", "Real-time Processing",
  "Long Context", "Tool Use", "RAG", "Fine-tuned",
];

const EMOJIS = ["🤖","🧠","⚡","🚀","💡","🔮","🌟","🎯","🛡️","🔬",
                "💻","📊","🎨","🌐","🔐","💎","🏆","⚙️","🌊","🦾"];

type Step = 1 | 2 | 3 | 4;

export function DeployAgentForm({ onSuccess }: { onSuccess?: (agentId: string) => void }) {
  const { isConnected } = useAccount();
  const { token, signIn, isAuthenticated } = useSiwe();
  const { deploy, status, error, deployFee } = useDeployAgent();

  const [step, setStep]   = useState<Step>(1);
  const [form, setForm]   = useState({
    name: "", description: "", category: "", emoji: "🤖",
    endpoint: "", capabilities: [] as string[], pricingModel: "free",
    pricePerCall: "", pricePerMonth: "", tags: "",
    topTasks: "", listed: false,
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggleCap = (cap: string) =>
    set("capabilities", form.capabilities.includes(cap)
      ? form.capabilities.filter(c => c !== cap)
      : [...form.capabilities, cap]);

  const handleDeploy = async () => {
    if (!token) { await signIn(); return; }
    try {
      const txHash = await deploy({
        ...form,
        tags:        form.tags.split(",").map(t => t.trim()).filter(Boolean),
        topTasks:    form.topTasks.split(",").map(t => t.trim()).filter(Boolean),
        authToken:   token,
      });
      setStep(4);
    } catch {}
  };

  if (!isConnected) return (
    <div className="deploy-gate">
      <div className="deploy-gate__icon">🔌</div>
      <h3>Connect your wallet to deploy an agent</h3>
    </div>
  );

  return (
    <div className="deploy-form">
      {/* Step indicator */}
      <div className="steps">
        {(["Configure","Capabilities","Deploy","Done"] as const).map((label, i) => (
          <div key={label} className={`step ${step === i+1 ? "step--active" : ""} ${step > i+1 ? "step--done" : ""}`}>
            <div className="step__num">{step > i+1 ? "✓" : i+1}</div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Step 1 — Configure */}
      {step === 1 && (
        <div className="deploy-step-body">
          <div className="form-group">
            <label>Agent Name</label>
            <input className="form-input" placeholder="e.g. PR Maestro" value={form.name}
              onChange={e => set("name", e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select className="form-select" value={form.category}
                onChange={e => set("category", e.target.value)}>
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Avatar</label>
              <div className="emoji-grid">
                {EMOJIS.map(e => (
                  <button key={e}
                    className={`emoji-opt ${form.emoji === e ? "emoji-opt--selected" : ""}`}
                    onClick={() => set("emoji", e)}
                  >{e}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea className="form-textarea" rows={3}
              placeholder="What does your agent do?"
              value={form.description}
              onChange={e => set("description", e.target.value)} />
          </div>

          <div className="form-group">
            <label>Endpoint URL (optional)</label>
            <input className="form-input" placeholder="https://your-agent.ai/api"
              value={form.endpoint} onChange={e => set("endpoint", e.target.value)} />
          </div>

          <button className="btn btn-primary btn-full"
            disabled={!form.name || !form.category}
            onClick={() => setStep(2)}>
            Continue →
          </button>
        </div>
      )}

      {/* Step 2 — Capabilities */}
      {step === 2 && (
        <div className="deploy-step-body">
          <div className="form-group">
            <label>Capabilities</label>
            <div className="cap-grid">
              {CAPABILITIES.map(c => (
                <button key={c}
                  className={`cap-tag ${form.capabilities.includes(c) ? "cap-tag--selected" : ""}`}
                  onClick={() => toggleCap(c)}>{c}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Top Tasks (comma separated)</label>
            <input className="form-input"
              placeholder="Press release, Media pitch, Crisis response…"
              value={form.topTasks} onChange={e => set("topTasks", e.target.value)} />
          </div>

          <div className="form-group">
            <label>Tags (comma separated)</label>
            <input className="form-input"
              placeholder="PR, branding, media, crisis…"
              value={form.tags} onChange={e => set("tags", e.target.value)} />
          </div>

          <div className="form-group">
            <label>Pricing Model</label>
            <div className="pricing-options">
              {[
                { v: "free",            label: "Free",            desc: "No payment required" },
                { v: "per_interaction", label: "Per Call",        desc: "Pay per execution" },
                { v: "subscription",    label: "Subscription",    desc: "Monthly flat fee" },
              ].map(opt => (
                <label key={opt.v} className={`pricing-opt ${form.pricingModel === opt.v ? "pricing-opt--selected" : ""}`}>
                  <input type="radio" name="pricing" value={opt.v}
                    checked={form.pricingModel === opt.v}
                    onChange={() => set("pricingModel", opt.v)} />
                  <strong>{opt.label}</strong>
                  <span>{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {form.pricingModel === "per_interaction" && (
            <div className="form-group">
              <label>Price Per Call (ETH)</label>
              <input className="form-input" type="number" step="0.0001"
                placeholder="0.001" value={form.pricePerCall}
                onChange={e => set("pricePerCall", e.target.value)} />
            </div>
          )}
          {form.pricingModel === "subscription" && (
            <div className="form-group">
              <label>Price Per Month (ETH)</label>
              <input className="form-input" type="number" step="0.001"
                placeholder="0.01" value={form.pricePerMonth}
                onChange={e => set("pricePerMonth", e.target.value)} />
            </div>
          )}

          <div className="form-group form-group--check">
            <label>
              <input type="checkbox" checked={form.listed}
                onChange={e => set("listed", e.target.checked)} />
              List on Marketplace immediately
            </label>
          </div>

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>Continue →</button>
          </div>
        </div>
      )}

      {/* Step 3 — Deploy */}
      {step === 3 && (
        <div className="deploy-step-body">
          <div className="deploy-summary">
            <div className="deploy-summary__avatar">{form.emoji}</div>
            <div>
              <h3>{form.name}</h3>
              <div className="deploy-summary__category">{form.category}</div>
            </div>
          </div>
          <div className="deploy-summary__desc">{form.description}</div>

          <div className="deploy-info-box">
            <div className="deploy-info-row">
              <span>Deploy fee</span>
              <strong>{deployFee ? `${Number(deployFee) / 1e18} ETH` : "0.001 ETH"}</strong>
            </div>
            <div className="deploy-info-row">
              <span>Network</span>
              <strong>Base Sepolia</strong>
            </div>
            <div className="deploy-info-row">
              <span>Standard</span>
              <strong>ERC-8004</strong>
            </div>
            <div className="deploy-info-row">
              <span>Marketplace</span>
              <strong>{form.listed ? "Listed" : "Not listed"}</strong>
            </div>
          </div>

          {!isAuthenticated && (
            <div className="deploy-auth-note">
              ℹ You'll be asked to sign a message (SIWE) before the tx
            </div>
          )}

          {error && <div className="deploy-error">{error.message}</div>}

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary btn-full"
              disabled={status === "uploading" || status === "confirming"}
              onClick={handleDeploy}>
              {status === "uploading"  ? "⏳ Uploading to IPFS…" :
               status === "confirming" ? "⛓ Confirming on-chain…" :
               "🚀 Deploy Agent"}
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Success */}
      {step === 4 && (
        <div className="deploy-success">
          <div className="deploy-success__icon">🎉</div>
          <h2>Agent Deployed!</h2>
          <p>Your ERC-8004 agent is live on Base. Activity will appear in the subgraph within ~30 seconds.</p>
          <button className="btn btn-primary" onClick={() => setStep(1)}>
            Deploy Another
          </button>
        </div>
      )}
    </div>
  );
}

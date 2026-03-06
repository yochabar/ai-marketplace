"use client";

import { useState } from "react";
import {
  useAccount, useConnect, useDisconnect, useChainId, useSwitchChain,
} from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { formatEther } from "viem";
import { useBalance } from "wagmi";
import { useSiwe } from "../hooks";

// ─── WalletButton ─────────────────────────────────────────────────────────────

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { disconnect }           = useDisconnect();
  const chainId                  = useChainId();
  const { switchChain }          = useSwitchChain();
  const { token, signIn, signOut, loading: siweLoading, isAuthenticated } = useSiwe();
  const { data: balance }        = useBalance({ address });
  const [open, setOpen]          = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (!isConnected) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="wallet-btn wallet-btn--connect"
        >
          Connect Wallet
        </button>
        {showModal && <ConnectModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  const shortAddr = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  const isWrongChain = chainId !== baseSepolia.id && chainId !== base.id;

  return (
    <div className="wallet-btn-wrap">
      {isWrongChain && (
        <button
          className="wallet-btn wallet-btn--warn"
          onClick={() => switchChain({ chainId: baseSepolia.id })}
        >
          ⚠ Switch to Base
        </button>
      )}

      <button
        className="wallet-btn wallet-btn--connected"
        onClick={() => setOpen(o => !o)}
      >
        <span className="wallet-dot" />
        {shortAddr}
      </button>

      {open && (
        <div className="wallet-dropdown">
          <div className="wallet-dropdown__addr">{address}</div>
          <div className="wallet-dropdown__balance">
            {balance ? `${parseFloat(formatEther(balance.value)).toFixed(4)} ETH` : "—"}
          </div>
          <div className="wallet-dropdown__chain">
            {chainId === base.id        ? "Base Mainnet"  :
             chainId === baseSepolia.id ? "Base Sepolia"  : `Chain ${chainId}`}
          </div>
          <hr />
          {!isAuthenticated ? (
            <button
              className="wallet-dropdown__action"
              onClick={signIn}
              disabled={siweLoading}
            >
              {siweLoading ? "Signing…" : "Sign In (SIWE)"}
            </button>
          ) : (
            <div className="wallet-dropdown__auth">✓ Signed in</div>
          )}
          <button
            className="wallet-dropdown__action wallet-dropdown__action--danger"
            onClick={() => { disconnect(); signOut(); setOpen(false); }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ConnectModal ─────────────────────────────────────────────────────────────

function ConnectModal({ onClose }: { onClose: () => void }) {
  const { connect, connectors, isPending } = useConnect();

  const ICONS: Record<string, string> = {
    injected:       "🦊",
    coinbaseWallet: "🔵",
    walletConnect:  "🔗",
  };

  const LABELS: Record<string, string> = {
    injected:       "MetaMask / Browser",
    coinbaseWallet: "Coinbase Wallet",
    walletConnect:  "WalletConnect",
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="connect-modal" onClick={e => e.stopPropagation()}>
        <div className="connect-modal__header">
          <h2>Connect Wallet</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <p className="connect-modal__sub">
          Connect your wallet to deploy agents, pay for calls, and leave feedback on-chain.
        </p>
        <div className="connect-modal__connectors">
          {connectors.map(connector => (
            <button
              key={connector.id}
              className="connector-btn"
              onClick={() => { connect({ connector }); onClose(); }}
              disabled={isPending}
            >
              <span className="connector-icon">
                {ICONS[connector.id] ?? "💼"}
              </span>
              <span>{LABELS[connector.id] ?? connector.name}</span>
            </button>
          ))}
        </div>
        <p className="connect-modal__disclaimer">
          By connecting you agree to our Terms. AgentChain never stores your private key.
        </p>
      </div>
    </div>
  );
}

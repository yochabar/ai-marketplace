import { http, createConfig } from "wagmi";
import { base, baseSepolia, mainnet } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import { createPublicClient } from "viem";

// ─── Supported chains ─────────────────────────────────────────────────────────
export const SUPPORTED_CHAINS = [baseSepolia, base, mainnet] as const;

// ─── wagmi config ─────────────────────────────────────────────────────────────
export const wagmiConfig = createConfig({
  chains: SUPPORTED_CHAINS,
  connectors: [
    injected(),                                        // MetaMask / browser wallet
    coinbaseWallet({ appName: "AgentChain" }),         // Coinbase Smart Wallet
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "YOUR_PROJECT_ID",
    }),
  ],
  transports: {
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA ?? "https://sepolia.base.org"),
    [base.id]:        http(process.env.NEXT_PUBLIC_RPC_BASE        ?? "https://mainnet.base.org"),
    [mainnet.id]:     http(),
  },
});

// ─── Contract addresses (per chain) ──────────────────────────────────────────
export const CONTRACT_ADDRESSES = {
  [baseSepolia.id]: {
    identity:   (process.env.NEXT_PUBLIC_BASE_SEPOLIA_IDENTITY   ?? "0x") as `0x${string}`,
    reputation: (process.env.NEXT_PUBLIC_BASE_SEPOLIA_REPUTATION ?? "0x") as `0x${string}`,
    validation: (process.env.NEXT_PUBLIC_BASE_SEPOLIA_VALIDATION ?? "0x") as `0x${string}`,
    marketplace:(process.env.NEXT_PUBLIC_BASE_SEPOLIA_MARKETPLACE?? "0x") as `0x${string}`,
    factory:    (process.env.NEXT_PUBLIC_BASE_SEPOLIA_FACTORY    ?? "0x") as `0x${string}`,
  },
  [base.id]: {
    identity:   (process.env.NEXT_PUBLIC_BASE_IDENTITY    ?? "0x") as `0x${string}`,
    reputation: (process.env.NEXT_PUBLIC_BASE_REPUTATION  ?? "0x") as `0x${string}`,
    validation: (process.env.NEXT_PUBLIC_BASE_VALIDATION  ?? "0x") as `0x${string}`,
    marketplace:(process.env.NEXT_PUBLIC_BASE_MARKETPLACE ?? "0x") as `0x${string}`,
    factory:    (process.env.NEXT_PUBLIC_BASE_FACTORY     ?? "0x") as `0x${string}`,
  },
} as const;

export type SupportedChainId = keyof typeof CONTRACT_ADDRESSES;

export function getContracts(chainId: number) {
  return CONTRACT_ADDRESSES[chainId as SupportedChainId] ?? CONTRACT_ADDRESSES[baseSepolia.id];
}

// ─── Viem public client (for reads without wagmi hook) ───────────────────────
export const publicClient = createPublicClient({
  chain:     baseSepolia,
  transport: http("https://sepolia.base.org"),
});

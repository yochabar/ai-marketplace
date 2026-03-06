// ─────────────────────────────────────────────────────────────────────────────
// AgentChain custom hooks
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAccount, useChainId, useReadContract,
  useWriteContract, useWaitForTransactionReceipt,
  usePublicClient, useSignMessage,
} from "wagmi";
import { parseEther, formatEther, getAddress } from "viem";
import { SiweMessage } from "siwe";
import { getContracts } from "../lib/wagmi";
import { FACTORY_ABI, MARKETPLACE_ABI, IDENTITY_ABI, REPUTATION_ABI } from "../lib/abis";
import { API_BASE } from "../lib/api";

// ─── useAgents — paginated list from subgraph via backend ─────────────────────

interface UseAgentsParams {
  page?:        number;
  limit?:       number;
  orderBy?:     string;
  category?:    string;
  isValidated?: boolean;
  hasListing?:  boolean;
  search?:      string;
}

export function useAgents(params: UseAgentsParams = {}) {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<Error | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      );
      const res = await fetch(`${API_BASE}/agents?${qs}`);
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

// ─── useAgent — single agent detail ──────────────────────────────────────────

export function useAgent(id: string | undefined) {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE}/agents/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setData)
      .catch(e => setError(new Error(e)))
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}

// ─── useLeaderboard ───────────────────────────────────────────────────────────

export function useLeaderboard() {
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/agents/leaderboard`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

// ─── useProtocolStats ─────────────────────────────────────────────────────────

export function useProtocolStats() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/analytics/overview`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

// ─── useDeployAgent — full deploy flow ───────────────────────────────────────

export function useDeployAgent() {
  const chainId  = useChainId();
  const contracts = getContracts(chainId);
  const { writeContractAsync } = useWriteContract();
  const { data: hash, reset } = useWriteContract();

  const [status, setStatus] = useState<
    "idle" | "uploading" | "confirming" | "success" | "error"
  >("idle");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [error, setError]     = useState<Error | null>(null);

  // 1. Read deploy fee from contract
  const { data: deployFee } = useReadContract({
    address: contracts.factory,
    abi:     FACTORY_ABI,
    functionName: "deployFee",
  });

  const deploy = useCallback(async (params: {
    name:         string;
    description:  string;
    category:     string;
    emoji?:       string;
    endpoint?:    string;
    capabilities: string[];
    pricingModel: string;
    pricePerCall? :string;
    pricePerMonth?:string;
    tags?:        string[];
    topTasks?:    string[];
    listed?:      boolean;
    authToken:    string;
  }) => {
    setStatus("uploading");
    setError(null);

    try {
      // Step 1: Upload to IPFS via backend
      const res = await fetch(`${API_BASE}/agents/prepare`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${params.authToken}`,
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(await res.text());
      const { agentURI } = await res.json();

      // Step 2: Call contract
      setStatus("confirming");
      const fee = deployFee ?? parseEther("0.001");

      const txHash = await writeContractAsync({
        address:      contracts.factory,
        abi:          FACTORY_ABI,
        functionName: "deployAgent",
        value:        fee,
        args: [
          agentURI,
          params.category,
          [],   // extraMetadata
          {
            listed:        params.listed ?? false,
            pricePerCall:  params.pricePerCall  ? parseEther(params.pricePerCall)  : 0n,
            pricePerMonth: params.pricePerMonth ? parseEther(params.pricePerMonth) : 0n,
            paymentToken:  "0x0000000000000000000000000000000000000000" as `0x${string}`,
            acceptsETH:    true,
          },
        ],
      });

      // Step 3: Wait for receipt and extract agentId from event
      setStatus("success");
      return txHash;

    } catch (e) {
      setStatus("error");
      setError(e as Error);
      throw e;
    }
  }, [contracts, deployFee, writeContractAsync]);

  return { deploy, status, agentId, error, deployFee };
}

// ─── usePayForCall ────────────────────────────────────────────────────────────

export function usePayForCall() {
  const chainId   = useChainId();
  const contracts = getContracts(chainId);
  const { writeContractAsync } = useWriteContract();

  const pay = useCallback(async (
    agentId:      bigint,
    pricePerCall: bigint,
    authSignature: `0x${string}`,
    authDeadline:  bigint,
  ) => {
    return writeContractAsync({
      address:      contracts.marketplace,
      abi:          MARKETPLACE_ABI,
      functionName: "payForCall",
      value:        pricePerCall,
      args:         [agentId, authSignature, authDeadline],
    });
  }, [contracts, writeContractAsync]);

  return { pay };
}

// ─── useSiwe — Sign-In with Ethereum ─────────────────────────────────────────

export function useSiwe() {
  const { address }        = useAccount();
  const chainId            = useChainId();
  const { signMessageAsync } = useSignMessage();
  const [token, setToken]  = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("agentchain:token") : null
  );
  const [loading, setLoading] = useState(false);

  const signIn = useCallback(async () => {
    if (!address) throw new Error("No wallet connected");
    setLoading(true);
    try {
      // 1. Get nonce
      const nonceRes = await fetch(`${API_BASE}/users/nonce?address=${address}`);
      const { nonce } = await nonceRes.json();

      // 2. Build SIWE message
      const message = new SiweMessage({
        domain:    window.location.host,
        address:   getAddress(address),
        statement: "Sign in to AgentChain",
        uri:       window.location.origin,
        version:   "1",
        chainId,
        nonce,
      }).prepareMessage();

      // 3. Sign with wallet
      const signature = await signMessageAsync({ message });

      // 4. Verify on backend
      const verifyRes = await fetch(`${API_BASE}/users/verify`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message, signature }),
      });
      if (!verifyRes.ok) throw new Error("Verification failed");

      const { token: jwt } = await verifyRes.json();
      setToken(jwt);
      localStorage.setItem("agentchain:token", jwt);
      return jwt;
    } finally {
      setLoading(false);
    }
  }, [address, chainId, signMessageAsync]);

  const signOut = useCallback(() => {
    setToken(null);
    localStorage.removeItem("agentchain:token");
  }, []);

  return { token, signIn, signOut, loading, isAuthenticated: !!token };
}

// ─── useAgentListing — live listing from contract ────────────────────────────

export function useAgentListing(agentId: bigint | undefined) {
  const chainId   = useChainId();
  const contracts = getContracts(chainId);

  return useReadContract({
    address:      contracts.marketplace,
    abi:          MARKETPLACE_ABI,
    functionName: "listings",
    args:         agentId !== undefined ? [agentId] : undefined,
    query:        { enabled: agentId !== undefined },
  });
}

// ─── useWebSocket — live event feed ──────────────────────────────────────────

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000/ws/feed";

export function useWebSocket(onMessage?: (msg: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws  = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen  = () => {
      setConnected(true);
    };
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      try { onMessage?.(JSON.parse(e.data)); } catch {}
    };

    const hb = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 25_000);

    return () => { clearInterval(hb); ws.close(); };
  }, []);

  const subscribe = (agentId: string) => {
    wsRef.current?.send(JSON.stringify({ type: "subscribe", agentId }));
  };

  return { connected, subscribe };
}

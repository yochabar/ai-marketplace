// ─── AgentFactory ABI (only functions we call from frontend) ─────────────────
export const FACTORY_ABI = [
  {
    name: "deployAgent",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "agentURI",       type: "string" },
      { name: "category",       type: "string" },
      { name: "extraMetadata",  type: "tuple[]", components: [
        { name: "metadataKey",   type: "string" },
        { name: "metadataValue", type: "bytes"  },
      ]},
      { name: "listing", type: "tuple", components: [
        { name: "listed",        type: "bool"    },
        { name: "pricePerCall",  type: "uint256" },
        { name: "pricePerMonth", type: "uint256" },
        { name: "paymentToken",  type: "address" },
        { name: "acceptsETH",    type: "bool"    },
      ]},
    ],
    outputs: [
      { name: "agentId",  type: "uint256" },
      { name: "globalId", type: "string"  },
    ],
  },
  {
    name: "deployFee",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalAgents",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "AgentDeployed",
    type: "event",
    inputs: [
      { name: "agentId",    type: "uint256", indexed: true  },
      { name: "owner",      type: "address", indexed: true  },
      { name: "globalId",   type: "string",  indexed: false },
      { name: "category",   type: "string",  indexed: false },
      { name: "agentURI",   type: "string",  indexed: false },
      { name: "hasListing", type: "bool",    indexed: false },
    ],
  },
] as const;

// ─── AgentMarketplace ABI ─────────────────────────────────────────────────────
export const MARKETPLACE_ABI = [
  {
    name: "payForCall",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "agentId",       type: "uint256" },
      { name: "authSignature", type: "bytes"   },
      { name: "authDeadline",  type: "uint256" },
    ],
    outputs: [{ name: "authHash", type: "bytes32" }],
  },
  {
    name: "subscribe",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "subId", type: "uint256" }],
  },
  {
    name: "listings",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      { name: "listed",        type: "bool"    },
      { name: "pricePerCall",  type: "uint256" },
      { name: "pricePerMonth", type: "uint256" },
      { name: "paymentToken",  type: "address" },
      { name: "acceptsETH",    type: "bool"    },
    ],
  },
  {
    name: "hasActiveSubscription",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user",    type: "address" },
      { name: "agentId", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

// ─── AgentIdentityRegistry ABI ────────────────────────────────────────────────
export const IDENTITY_ABI = [
  {
    name: "agentURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    name: "totalAgents",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

// ─── AgentReputationRegistry ABI ─────────────────────────────────────────────
export const REPUTATION_ABI = [
  {
    name: "giveFeedback",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId",       type: "uint256" },
      { name: "value",         type: "int128"  },
      { name: "valueDecimals", type: "uint8"   },
      { name: "tag1",          type: "string"  },
      { name: "tag2",          type: "string"  },
      { name: "endpoint",      type: "string"  },
      { name: "feedbackURI",   type: "string"  },
      { name: "feedbackHash",  type: "bytes32" },
      { name: "authHash",      type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "getAverageScore",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      { name: "avgBps", type: "int256" },
      { name: "count",  type: "uint256" },
    ],
  },
] as const;

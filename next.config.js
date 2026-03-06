/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for wagmi/viem SSR compatibility
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
  // Suppress punycode deprecation warning from WalletConnect deps
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;

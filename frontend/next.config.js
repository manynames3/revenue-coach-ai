/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  experimental: {
    agentUpgrade: "security",
  },
  output: "export",
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;

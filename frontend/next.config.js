/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow fetching from the backend in dev
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;

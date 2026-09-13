/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // 100 MB = 104857600 bytes — videos, stories, related uploads
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;

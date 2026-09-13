/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // 100 MB = 104857600 bytes — videos, stories, related uploads
      bodySizeLimit: "100mb",
    },
  },
  images: {
    // Local brand assets under /public
    unoptimized: false,
  },
};

export default nextConfig;

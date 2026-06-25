/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // ← WebContainer mein image optimization nahi chalti
  },
  experimental: {
    turbo: false, // ← Turbopack disable — WebContainer mein issue hota hai
  },
};

module.exports = nextConfig;
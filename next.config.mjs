/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Turbopack configuration (Next.js 16+)
  // Empty config to use Turbopack (plotly.js should work without alias)
  turbopack: {},
}

export default nextConfig

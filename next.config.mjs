/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  images: {
    // Serve AVIF first (≈30-50% smaller than WebP) and fall back to WebP, then
    // the original JPEG/PNG. On top of the pre-compressed source photos (long
    // edge ≤2000 px) this further cuts initial paint and typology swaps.
    formats: ["image/avif", "image/webp"],
    // Source brand photos top out at ~2000 px on the long edge, so generating
    // 3840 px variants would only upscale. Trim the ladder to avoid wasted
    // optimizer CPU and oversized transfers.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2560],
    // Brand assets are effectively immutable (renamed, not edited in place), so
    // let the optimizer keep its rendered AVIF/WebP for a year.
    minimumCacheTTL: 31536000,
  },
};
export default nextConfig;

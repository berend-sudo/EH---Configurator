/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  images: {
    // Serve AVIF first (≈30-50% smaller than WebP) and fall back to WebP, then
    // the original JPEG/PNG. Brand photos under public/brand are large (2-4 MB
    // each) so this materially cuts initial paint and typology swaps.
    formats: ["image/avif", "image/webp"],
  },
};
export default nextConfig;

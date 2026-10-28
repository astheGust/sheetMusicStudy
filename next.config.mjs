/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist'],
  images: {
    unoptimized: true,
  },
}

export default nextConfig

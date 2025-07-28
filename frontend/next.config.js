/** @type {import('next').NextConfig} */
const nextConfig = {
    // Remove static export for better performance
    // output: 'export',
    trailingSlash: true,
    images: {
        unoptimized: true
    }
}

module.exports = nextConfig
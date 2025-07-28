/** @type {import('next').NextConfig} */
const nextConfig = {
    // Remove static export for better performance
    // output: 'export',
    trailingSlash: true,
    images: {
        unoptimized: true,
        domains: ['localhost', 'kmu-disciplinedesk.onrender.com'],
        remotePatterns: [{
            protocol: 'https',
            hostname: 'kmu-disciplinedesk.onrender.com',
            port: '',
            pathname: '/**',
        }, ],
    }
}

module.exports = nextConfig
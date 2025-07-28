/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable static export for better reliability
    output: 'export',
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
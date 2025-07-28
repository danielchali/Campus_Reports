/** @type {import('next').NextConfig} */
const nextConfig = {
    // Web Service deployment - no static export needed
    images: {
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
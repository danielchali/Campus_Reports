const apiOrigin = (() => {
    try {
        return process.env.NEXT_PUBLIC_API_BASE_URL ? new URL(process.env.NEXT_PUBLIC_API_BASE_URL).origin : '';
    } catch {
        return '';
    }
})();

const cspScriptSources = [
    "'self'",
    "'unsafe-inline'",
    'https://accounts.google.com',
    'https://apis.google.com',
];
if (process.env.NODE_ENV !== 'production') cspScriptSources.push("'unsafe-eval'");

const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src ${cspScriptSources.join(' ')}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' ${apiOrigin} http://localhost:3000 http://127.0.0.1:3000 http://localhost:5000 http://127.0.0.1:5000 https://kmu-discipline-desk-backend.onrender.com https://kmu-disciplinedesk.onrender.com https://accounts.google.com https://*.googleapis.com ws: wss:`.replace(/\s+/g, ' ').trim(),
    "frame-src 'self' https://accounts.google.com https://*.google.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Performance optimizations
    experimental: {
        optimizePackageImports: ['chart.js', 'react-chartjs-2', 'clsx'],
        turbo: {
            rules: {
                '*.svg': {
                    loaders: ['@svgr/webpack'],
                    as: '*.js',
                },
            },
        },
    },

    // Compression and optimization
    compress: true,
    poweredByHeader: false,

    // Image optimization
    images: {
        domains: ['localhost', 'kmu-disciplinedesk.onrender.com'],
        remotePatterns: [{
            protocol: 'https',
            hostname: 'kmu-disciplinedesk.onrender.com',
            port: '',
            pathname: '/**',
        }],
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    },

    // Bundle optimization
    webpack: (config, { dev, isServer }) => {
        // Tree shaking optimization
        config.optimization = {
            ...config.optimization,
            usedExports: true,
            sideEffects: false,
        };

        // Split chunks optimization
        config.optimization.splitChunks = {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all',
                    priority: 10,
                },
                common: {
                    name: 'common',
                    minChunks: 2,
                    chunks: 'all',
                    priority: 5,
                },
            },
        };

        // Bundle analyzer (only in development)
        if (dev && !isServer) {
            const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
            config.plugins.push(
                new BundleAnalyzerPlugin({
                    analyzerMode: 'static',
                    openAnalyzer: false,
                })
            );
        }

        return config;
    },

    // Headers for caching and performance
    async headers() {
        return [{
                source: '/embed/:path*',
                headers: [{
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: "frame-ancestors 'self' http://localhost:3000 https://campusreports.vercel.app *",
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), payment=()',
                    },
                ],
            },
            {
                source: '/((?!embed).*)',
                headers: [{
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: contentSecurityPolicy,
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), payment=()',
                    },
                ],
            },
            {
                source: '/static/(.*)',
                headers: [{
                    key: 'Cache-Control',
                    value: 'public, max-age=31536000, immutable',
                }, ],
            },
            {
                source: '/_next/static/(.*)',
                headers: [{
                    key: 'Cache-Control',
                    value: 'public, max-age=31536000, immutable',
                }, ],
            },
        ];
    },

    // PWA optimizations
    async rewrites() {
        return [];
    },
}

module.exports = nextConfig

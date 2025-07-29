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
                source: '/(.*)',
                headers: [{
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
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
        return [{
            source: '/sw.js',
            destination: '/_next/static/sw.js',
        }, ];
    },
}

module.exports = nextConfig
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '5000',
                pathname: '/upload/**',
            },
            // Google account avatars (lh3/lh4/lh5/lh6.googleusercontent.com)
            {
                protocol: 'https',
                hostname: '**.googleusercontent.com',
            },
            // Facebook account avatars
            {
                protocol: 'https',
                hostname: 'platform-lookaside.fbsbx.com',
            },
            {
                protocol: 'https',
                hostname: 'graph.facebook.com',
            },
        ],
    },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  webpack(config) {
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : config.externals ? [config.externals] : []),
      ({ request }, callback) => {
        if (/^(jspdf|jspdf-autotable)$/.test(request)) return callback(null, `commonjs ${request}`);
        callback();
      },
    ];
    return config;
  },
  // API proxy handled by src/app/api/[...slug]/route.ts serverless function
};

module.exports = nextConfig;

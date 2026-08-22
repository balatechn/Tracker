/** @type {import('next').NextConfig} */
const nextConfig = {
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
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://api.itasset.junobohotels.com';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

// next.config.js
module.exports = {
  webpack(config) {
    config.node = {
      __dirname: true, // Ensure compatibility with __dirname
      __filename: true, // Ensure compatibility with __filename
      global: true, // Ensure compatibility with global
    };
    return config;
  },
  // Ensure React JSX is properly handled
  reactStrictMode: true,
  // Disable type checking during build for faster builds
  typescript: {
    ignoreBuildErrors: false,
  },
};

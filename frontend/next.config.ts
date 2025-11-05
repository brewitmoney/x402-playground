import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // Exclude server-only Node.js modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        worker_threads: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        http: false,
        https: false,
        zlib: false,
        buffer: false,
        events: false,
      };

      // Handle node: protocol imports
      config.resolve.alias = {
        ...config.resolve.alias,
        "node:crypto": false,
        "node:stream": false,
        "node:util": false,
        "node:url": false,
        "node:http": false,
        "node:https": false,
        "node:zlib": false,
        "node:buffer": false,
        "node:events": false,
        "node:fs": false,
        "node:net": false,
        "node:tls": false,
      };

      // Ignore server-side imports
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^x402-mcp\/dist\/server\.js$/,
        }),
        new webpack.IgnorePlugin({
          checkResource(resource: string) {
            return resource.startsWith("node:");
          },
        })
      );
    }
    return config;
  },
};

export default nextConfig;

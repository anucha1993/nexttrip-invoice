import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the AWS S3 SDK (used for Cloudflare R2) external instead of bundling it into routes.
  serverExternalPackages: ["@aws-sdk/client-s3"],
};

export default nextConfig;

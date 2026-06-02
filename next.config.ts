import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "export",
  basePath: isProduction ? "/CRAN3O_Color_Studio" : undefined,
};

export default nextConfig;

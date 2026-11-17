import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@mastermoshai/core"],
  // Lecture sheets are not public files; ship them with the route that checks access.
  outputFileTracingIncludes: { "/api/content/[id]": ["./content/sheets/**"] },
};
export default config;

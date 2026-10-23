import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = { devIndicators: false };
const withMDX = createMDX({
  options: { remarkPlugins: ["remark-gfm"] },
});

export default withMDX(nextConfig);

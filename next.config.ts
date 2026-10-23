import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = { devIndicators: false };
// Korean prose uses "~" for ranges (0~300 ms), so only "~~" marks strikethrough.
const withMDX = createMDX({
  options: { remarkPlugins: [["remark-gfm", { singleTilde: false }]] },
});

export default withMDX(nextConfig);

import type { MDXComponents } from "mdx/types";
import { EarlyHintsDemo } from "@/components/early-hints-demo";

const components: MDXComponents = { EarlyHintsDemo };

export function useMDXComponents(): MDXComponents {
  return components;
}

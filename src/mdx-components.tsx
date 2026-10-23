import type { MDXComponents } from "mdx/types";
import { EarlyHintsDemo } from "@/components/early-hints-demo";
import { EarlyHintsLcpTimeline, EarlyHintsMeasurement, EarlyHintsWrongHintTimeline } from "@/components/early-hints-measurement";
import { EarlyHintsWaitChart } from "@/components/early-hints-wait-chart";

const components: MDXComponents = { EarlyHintsDemo, EarlyHintsMeasurement, EarlyHintsLcpTimeline, EarlyHintsWaitChart, EarlyHintsWrongHintTimeline };

export function useMDXComponents(): MDXComponents {
  return components;
}

import type { MDXComponents } from "mdx/types";
import { EarlyHintsDemo } from "@/components/early-hints-demo";
import { EarlyHintsLcpTimeline, EarlyHintsMeasurement, EarlyHintsWrongHintTimeline } from "@/components/early-hints-measurement";
import { EarlyHintsWaitChart } from "@/components/early-hints-wait-chart";
import { ScrollPriorityExp1Chart, ScrollPriorityExp2Chart, ScrollPriorityTimelineFair, ScrollPriorityTimelinePriority } from "@/components/scroll-image-priority-charts";

const components: MDXComponents = {
  EarlyHintsDemo, EarlyHintsMeasurement, EarlyHintsLcpTimeline, EarlyHintsWaitChart, EarlyHintsWrongHintTimeline,
  ScrollPriorityExp1Chart, ScrollPriorityExp2Chart, ScrollPriorityTimelinePriority, ScrollPriorityTimelineFair,
};

export function useMDXComponents(): MDXComponents {
  return components;
}

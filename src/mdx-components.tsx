import type { MDXComponents } from "mdx/types";
import { EarlyHintsDemo } from "@/components/early-hints-demo";
import { EarlyHintsLcpTimeline, EarlyHintsMeasurement, EarlyHintsWrongHintTimeline } from "@/components/early-hints-measurement";
import { EarlyHintsWaitChart } from "@/components/early-hints-wait-chart";
import { ScrollPriorityExp1Chart, ScrollPriorityExp2Chart, ScrollPriorityTimelineFair, ScrollPriorityTimelinePriority } from "@/components/scroll-image-priority-charts";
import { MultiTabDelayChart, MultiTabPresenceChart, MultiTabWaitChart } from "@/components/multi-tab-charts";
import { MultiTabEventDiagram, MultiTabSocketDiagram } from "@/components/multi-tab-diagrams";
import { StaleTabWaitChart } from "@/components/stale-tab-charts";

const components: MDXComponents = {
  EarlyHintsDemo, EarlyHintsMeasurement, EarlyHintsLcpTimeline, EarlyHintsWaitChart, EarlyHintsWrongHintTimeline,
  ScrollPriorityExp1Chart, ScrollPriorityExp2Chart, ScrollPriorityTimelinePriority, ScrollPriorityTimelineFair,
  StaleTabWaitChart,
  MultiTabPresenceChart, MultiTabWaitChart, MultiTabDelayChart, MultiTabSocketDiagram, MultiTabEventDiagram,
};

export function useMDXComponents(): MDXComponents {
  return components;
}

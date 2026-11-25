import { NormalizedSession, StepRole } from "@/src/types/session";

export interface GraphStepNode {
  id: string;
  stepId: string;
  index: number;
  role: StepRole;
  label: string;
  totalTokens: number;
  cacheReadTokens: number;
  hasError: boolean;
  toolCount: number;
  x: number;
  y: number;
}

export interface GraphContextNode {
  id: string;
  label: string;
  fullPath: string;
  kind: "file" | "tool";
  touchCount: number;
  isDuplicateRead: boolean;
  hasError: boolean;
  stepIds: string[];
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  fromId: string;
  toId: string;
  kind: "flow" | "context";
  isError: boolean;
  isDuplicate: boolean;
}

export interface SessionGraphData {
  stepNodes: GraphStepNode[];
  contextNodes: GraphContextNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
}

export const STEP_NODE_W = 290;
export const STEP_NODE_H = 46;
export const CTX_NODE_W = 330;
export const CTX_NODE_H = 42;

function shortenPath(raw: string): string {
  const parts = raw.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length <= 2) return parts.join("/") || raw;
  return parts.slice(-2).join("/");
}

export function buildSessionGraph(
  session: NormalizedSession,
  duplicatePaths: Set<string>
): SessionGraphData {
  const stepX = 24;
  const stepGap = 18;
  const ctxX = 460;
  const ctxGap = 16;
  const topPad = 20;

  const stepNodes: GraphStepNode[] = [];
  const edges: GraphEdge[] = [];
  const contextMap = new Map<string, GraphContextNode>();

  session.steps.forEach((step, idx) => {
    const stepNodeId = `step:${step.id}`;
    const totalTokens =
      step.usage.inputTokens +
      step.usage.outputTokens +
      step.usage.cacheReadTokens +
      step.usage.cacheWriteTokens;
    const hasError = step.toolCalls.some((t) => t.status === "error");

    stepNodes.push({
      id: stepNodeId,
      stepId: step.id,
      index: step.index,
      role: step.role,
      label: step.summary,
      totalTokens,
      cacheReadTokens: step.usage.cacheReadTokens,
      hasError,
      toolCount: step.toolCalls.length,
      x: stepX,
      y: topPad + idx * (STEP_NODE_H + stepGap),
    });

    if (idx > 0) {
      const prevNode = stepNodes[idx - 1];
      edges.push({
        id: `flow:${prevNode.id}->${stepNodeId}`,
        fromId: prevNode.id,
        toId: stepNodeId,
        kind: "flow",
        isError: hasError,
        isDuplicate: false,
      });
    }

    const stepEdgeMap = new Map<string, { isError: boolean; isDuplicate: boolean }>();

    for (const tool of step.toolCalls) {
      const isFile = Boolean(tool.targetPath);
      const rawKey = tool.targetPath ?? tool.name;
      const ctxId = `ctx:${isFile ? "file" : "tool"}:${rawKey}`;
      const isDuplicate = Boolean(tool.targetPath && duplicatePaths.has(tool.targetPath));
      const isToolErr = tool.status === "error";

      let existing = contextMap.get(ctxId);
      if (!existing) {
        existing = {
          id: ctxId,
          label: isFile ? shortenPath(rawKey) : rawKey,
          fullPath: rawKey,
          kind: isFile ? "file" : "tool",
          touchCount: 0,
          isDuplicateRead: isDuplicate,
          hasError: false,
          stepIds: [],
          x: ctxX,
          y: topPad,
        };
        contextMap.set(ctxId, existing);
      }

      existing.touchCount += 1;
      if (isDuplicate) existing.isDuplicateRead = true;
      if (isToolErr) existing.hasError = true;
      if (!existing.stepIds.includes(step.id)) {
        existing.stepIds.push(step.id);
      }

      const prevEdge = stepEdgeMap.get(ctxId);
      stepEdgeMap.set(ctxId, {
        isError: (prevEdge?.isError ?? false) || isToolErr,
        isDuplicate: (prevEdge?.isDuplicate ?? false) || isDuplicate,
      });
    }

    for (const [ctxId, flags] of stepEdgeMap.entries()) {
      edges.push({
        id: `ctx:${stepNodeId}->${ctxId}`,
        fromId: stepNodeId,
        toId: ctxId,
        kind: "context",
        isError: flags.isError,
        isDuplicate: flags.isDuplicate,
      });
    }
  });

  const contextNodes = Array.from(contextMap.values()).map((node, idx) => ({
    ...node,
    y: topPad + idx * (CTX_NODE_H + ctxGap),
  }));

  const stepBottom =
    stepNodes.length > 0 ? stepNodes[stepNodes.length - 1].y + STEP_NODE_H : topPad;
  const ctxBottom =
    contextNodes.length > 0 ? contextNodes[contextNodes.length - 1].y + CTX_NODE_H : topPad;

  return {
    stepNodes,
    contextNodes,
    edges,
    width: 820,
    height: Math.max(220, stepBottom + 24, ctxBottom + 24),
  };
}

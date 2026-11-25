import { TokenUsage } from "@/src/types/session";

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion: number;
  cacheWritePerMillion: number;
}

// Verified Nov 2026 list prices (USD per 1M tokens)
const PRICING_TABLE: Array<{ match: RegExp; pricing: ModelPricing }> = [
  // Anthropic Claude 5 family
  {
    match: /claude.*fable-5-2|claude.*mythos-5-2/i,
    pricing: { inputPerMillion: 8, outputPerMillion: 40, cacheReadPerMillion: 0.2, cacheWritePerMillion: 10 },
  },
  {
    match: /claude.*fable-5-1|claude.*mythos-5-1/i,
    pricing: { inputPerMillion: 10, outputPerMillion: 50, cacheReadPerMillion: 0.25, cacheWritePerMillion: 12.5 },
  },
  {
    match: /claude.*opus-5-5/i,
    pricing: { inputPerMillion: 4, outputPerMillion: 20, cacheReadPerMillion: 0.2, cacheWritePerMillion: 5 },
  },
  {
    match: /claude.*sonnet-5-5|claude.*sonnet-5/i,
    pricing: { inputPerMillion: 2, outputPerMillion: 10, cacheReadPerMillion: 0.1, cacheWritePerMillion: 2.5 },
  },
  {
    match: /claude.*haiku-5-5/i,
    pricing: { inputPerMillion: 0.1, outputPerMillion: 0.5, cacheReadPerMillion: 0.01, cacheWritePerMillion: 0.125 },
  },
  // OpenAI GPT-6 family
  {
    match: /gpt-6\.2-astra/i,
    pricing: { inputPerMillion: 8, outputPerMillion: 40, cacheReadPerMillion: 0.4, cacheWritePerMillion: 8 },
  },
  {
    match: /gpt-6-astra/i,
    pricing: { inputPerMillion: 10, outputPerMillion: 50, cacheReadPerMillion: 1.0, cacheWritePerMillion: 10 },
  },
  {
    match: /gpt-6\.2-sol|gpt-6-sol|codex/i,
    pricing: { inputPerMillion: 2, outputPerMillion: 10, cacheReadPerMillion: 0.2, cacheWritePerMillion: 2 },
  },
  // Google DeepMind Gemini 4 family
  {
    match: /gemini-4-neon/i,
    pricing: { inputPerMillion: 3, outputPerMillion: 15, cacheReadPerMillion: 0.15, cacheWritePerMillion: 3 },
  },
  {
    match: /gemini-4-carbon|gemini-4-argon/i,
    pricing: { inputPerMillion: 2, outputPerMillion: 10, cacheReadPerMillion: 0.1, cacheWritePerMillion: 2 },
  },
  {
    match: /gemini-4-hydrogen/i,
    pricing: { inputPerMillion: 1.5, outputPerMillion: 7.5, cacheReadPerMillion: 0.075, cacheWritePerMillion: 1.5 },
  },
];

const DEFAULT_PRICING: ModelPricing = {
  inputPerMillion: 3,
  outputPerMillion: 15,
  cacheReadPerMillion: 0.15,
  cacheWritePerMillion: 3,
};

export function getModelPricing(modelName: string): ModelPricing {
  const entry = PRICING_TABLE.find((item) => item.match.test(modelName));
  return entry ? entry.pricing : DEFAULT_PRICING;
}

export function calculateUsageCost(usage: TokenUsage, modelName: string): { costUsd: number; savingsUsd: number } {
  const p = getModelPricing(modelName);
  const inputCost = (usage.inputTokens / 1_000_000) * p.inputPerMillion;
  const outputCost = (usage.outputTokens / 1_000_000) * p.outputPerMillion;
  const cacheReadCost = (usage.cacheReadTokens / 1_000_000) * p.cacheReadPerMillion;
  const cacheWriteCost = (usage.cacheWriteTokens / 1_000_000) * p.cacheWritePerMillion;

  const costUsd = inputCost + outputCost + cacheReadCost + cacheWriteCost;
  const uncachedEquivalent = (usage.cacheReadTokens / 1_000_000) * p.inputPerMillion;
  const savingsUsd = Math.max(0, uncachedEquivalent - cacheReadCost);

  return { costUsd, savingsUsd };
}

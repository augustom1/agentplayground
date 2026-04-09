/**
 * Weekly Optimization Scanner.
 * Runs every Sunday at midnight UTC (triggered via cron).
 * Analyzes the past 7 days of API usage, task patterns, and protocol performance.
 * Uses Claude Haiku (cheapest model) for analysis — or falls back to a local report.
 */

import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export interface ScanResult {
  weekStart: Date;
  weekEnd: Date;
  apiCallsTotal: number;
  localCallsTotal: number;
  creditsSpent: number;
  creditsSaved: number;
  protocolsCreated: number;
  report: string;
  recommendations: Array<{
    title: string;
    description: string;
    estimatedSaving: number;
    priority: "high" | "medium" | "low";
  }>;
}

export async function runWeeklyOptimizationScan(): Promise<ScanResult> {
  const weekEnd = new Date();
  const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Gather all data in parallel
  const [apiUsage, completedTasks, protocols, recurringTasks, previousScan] = await Promise.all([
    prisma.apiUsage.findMany({
      where: { createdAt: { gte: weekStart } },
    }),
    prisma.task.findMany({
      where: { status: "completed", completedAt: { gte: weekStart } },
      select: { id: true, title: true, prompt: true, createdAt: true },
      take: 50,
      orderBy: { completedAt: "desc" },
    }),
    prisma.taskProtocol.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        category: true,
        localModel: true,
        successCount: true,
        failureCount: true,
        estimatedSaving: true,
        confidence: true,
      },
      orderBy: { successCount: "desc" },
    }),
    prisma.recurringTask.findMany({
      where: { enabled: true },
      select: { id: true, title: true, prompt: true, cron: true },
      take: 20,
    }),
    prisma.optimizationScan.findFirst({
      orderBy: { createdAt: "desc" },
      select: { creditsSpent: true, creditsSaved: true, protocolsCreated: true },
    }),
  ]);

  // Aggregate stats
  const claudeUsage = apiUsage.filter((u) => u.service === "claude");
  const ollamaUsage = apiUsage.filter((u) => u.service === "ollama");
  const creditsSpent = apiUsage.reduce((sum, u) => sum + u.credits, 0);
  const creditsSaved = protocols.reduce(
    (sum, p) => sum + p.estimatedSaving * p.successCount,
    0
  );
  const newProtocolsThisWeek = await prisma.taskProtocol.count({
    where: { createdAt: { gte: weekStart } },
  });

  // Build usage breakdown by model
  const byModel: Record<string, { calls: number; inputTokens: number; outputTokens: number; credits: number }> = {};
  for (const u of claudeUsage) {
    const key = u.endpoint ?? "unknown";
    if (!byModel[key]) byModel[key] = { calls: 0, inputTokens: 0, outputTokens: 0, credits: 0 };
    byModel[key].calls++;
    byModel[key].inputTokens += u.inputUnits ?? 0;
    byModel[key].outputTokens += u.outputUnits ?? 0;
    byModel[key].credits += u.credits;
  }

  const modelBreakdown =
    Object.entries(byModel)
      .map(
        ([m, s]) =>
          `- ${m}: ${s.calls} calls · ${s.inputTokens.toLocaleString()} in / ${s.outputTokens.toLocaleString()} out tokens · ${s.credits.toFixed(0)} credits`
      )
      .join("\n") || "No Claude API calls this week.";

  const topProtocols =
    protocols
      .slice(0, 5)
      .map(
        (p) =>
          `- "${p.name}" (${p.category}): used ${p.successCount}x · saved ~${(p.estimatedSaving * p.successCount).toFixed(0)} credits · model: ${p.localModel}`
      )
      .join("\n") || "None yet.";

  const recurringList =
    recurringTasks
      .map((t) => `- "${t.title}" [${t.cron}]: ${t.prompt?.slice(0, 80) ?? "no prompt"}`)
      .join("\n") || "None.";

  const taskSample =
    completedTasks
      .slice(0, 8)
      .map((t) => `- "${t.title}": ${t.prompt?.slice(0, 100) ?? "no prompt"}`)
      .join("\n") || "None.";

  // Build fallback report (used if Claude is unavailable)
  const fallbackReport = buildFallbackReport({
    weekStart,
    weekEnd,
    claudeCallsCount: claudeUsage.length,
    ollamaCallsCount: ollamaUsage.length,
    creditsSpent,
    creditsSaved,
    protocolCount: protocols.length,
    newProtocols: newProtocolsThisWeek,
    modelBreakdown,
    topProtocols,
    previousSpend: previousScan?.creditsSpent ?? 0,
  });

  let report = fallbackReport;
  let recommendations: ScanResult["recommendations"] = [];

  // Try Claude Haiku for intelligent analysis (cheapest model, ~0.25 credits/1k tokens)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && claudeUsage.length > 0) {
    try {
      const client = new Anthropic({ apiKey });
      const prompt = `You are analyzing an AI platform's weekly usage to find cost optimization opportunities.

## This Week's API Usage (${weekStart.toDateString()} → ${weekEnd.toDateString()})
${modelBreakdown}

Total credits spent: ${creditsSpent.toFixed(0)} | Ollama (free) calls: ${ollamaUsage.length}
Credits saved this week by local protocols: ~${creditsSaved.toFixed(0)}

## Top Performing Local Protocols
${topProtocols}

## Completed Tasks (sample)
${taskSample}

## Recurring Scheduled Tasks (automation candidates)
${recurringList}

## Context
- New protocols created this week: ${newProtocolsThisWeek}
- Total active protocols: ${protocols.length}
${previousScan ? `- Last week's spend: ${previousScan.creditsSpent.toFixed(0)} credits` : ""}

Generate a JSON response with:
1. A 2-3 paragraph markdown optimization report (insights, trends, wins)
2. Top 5 actionable recommendations ranked by potential savings

{
  "report": "## Weekly Optimization Report\\n...(markdown)...",
  "recommendations": [
    {
      "title": "Offload X tasks to qwen2.5:0.5b",
      "description": "These tasks only need classification...",
      "estimatedSaving": 150,
      "priority": "high"
    }
  ]
}`;

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          report: string;
          recommendations: ScanResult["recommendations"];
        };
        report = parsed.report ?? fallbackReport;
        recommendations = parsed.recommendations ?? [];
      }
    } catch (err) {
      console.error("[scanner] Claude analysis failed, using fallback report:", err);
    }
  }

  // Persist scan
  await prisma.optimizationScan.create({
    data: {
      weekStart,
      weekEnd,
      apiCallsTotal: claudeUsage.length,
      localCallsTotal: ollamaUsage.length,
      creditsSpent,
      creditsSaved,
      protocolsCreated: newProtocolsThisWeek,
      report,
      recommendations,
    },
  });

  return {
    weekStart,
    weekEnd,
    apiCallsTotal: claudeUsage.length,
    localCallsTotal: ollamaUsage.length,
    creditsSpent,
    creditsSaved,
    protocolsCreated: newProtocolsThisWeek,
    report,
    recommendations,
  };
}

function buildFallbackReport(data: {
  weekStart: Date;
  weekEnd: Date;
  claudeCallsCount: number;
  ollamaCallsCount: number;
  creditsSpent: number;
  creditsSaved: number;
  protocolCount: number;
  newProtocols: number;
  modelBreakdown: string;
  topProtocols: string;
  previousSpend: number;
}): string {
  const totalCalls = data.claudeCallsCount + data.ollamaCallsCount;
  const localPct = totalCalls > 0 ? Math.round((data.ollamaCallsCount / totalCalls) * 100) : 0;
  const trend =
    data.previousSpend > 0
      ? data.creditsSpent < data.previousSpend
        ? `↓ ${Math.round(((data.previousSpend - data.creditsSpent) / data.previousSpend) * 100)}% vs last week`
        : `↑ ${Math.round(((data.creditsSpent - data.previousSpend) / data.previousSpend) * 100)}% vs last week`
      : "First scan";

  return `## Weekly Optimization Report
**${data.weekStart.toDateString()} → ${data.weekEnd.toDateString()}**

### Usage Summary
| Metric | Value |
|---|---|
| Claude API calls | ${data.claudeCallsCount} |
| Local Ollama calls | ${data.ollamaCallsCount} (free) |
| Local usage % | ${localPct}% |
| Credits spent | ${data.creditsSpent.toFixed(0)} (${trend}) |
| Credits saved by protocols | ~${data.creditsSaved.toFixed(0)} |
| Active protocols | ${data.protocolCount} |
| New protocols this week | ${data.newProtocols} |

### API Breakdown
${data.modelBreakdown}

### Top Saving Protocols
${data.topProtocols}

*Full AI analysis requires ANTHROPIC_API_KEY to be set.*`;
}

export interface LLMExplanationRequest {
  riskScore: number;
  level: string;
  reasons: string[];
  signals: {
    type: string;
    score: number;
    detail: string;
  }[];
  sellerName: string;
  transactionAmount: number;
}

export interface LLMExplanationResponse {
  summary: string;
  detailedAnalysis: string;
  recommendedAction: string;
}

export async function generateLLMExplanation(
  input: LLMExplanationRequest
): Promise<LLMExplanationResponse> {
  // Build context for LLM
  const signalSummary = input.signals
    .map((s) => `${s.type}: ${s.score}/100 - ${s.detail}`)
    .join("\n");

  const prompt = `You are a fraud analyst explaining a risk assessment.

Transaction Details:
- Seller: ${input.sellerName}
- Amount: ₹${input.transactionAmount.toLocaleString()}
- Risk Score: ${input.riskScore}/100
- Risk Level: ${input.level}

Risk Signals:
${signalSummary}

Key Reasons:
${input.reasons.map((r) => `- ${r}`).join("\n")}

Provide a clear, professional explanation for this fraud assessment.`;

  // Mock LLM response (replace with actual LLM API call)
  const summary = generateMockSummary(input);
  const detailedAnalysis = generateMockAnalysis(input);
  const recommendedAction = generateMockAction(input);

  return { summary, detailedAnalysis, recommendedAction };
}

function generateMockSummary(input: LLMExplanationRequest): string {
  const { riskScore, level, reasons } = input;

  if (level === "LOW") {
    return `This transaction has a low risk score of ${riskScore}/100. The seller appears to be legitimate with normal activity patterns.`;
  }

  if (level === "MEDIUM") {
    return `This transaction shows moderate risk indicators (${riskScore}/100). Some factors warrant attention: ${reasons[0] || "unusual patterns detected"}.`;
  }

  if (level === "HIGH") {
    return `This transaction is flagged as high risk (${riskScore}/100). Multiple concerning signals detected: ${reasons.slice(0, 2).join(" and ")}.`;
  }

  return `This transaction is critical risk (${riskScore}/100). Strong fraud indicators present: ${reasons.slice(0, 3).join(", ")}. Immediate review recommended.`;
}

function generateMockAnalysis(input: LLMExplanationRequest): string {
  const { signals, reasons } = input;

  let analysis = "Analysis breakdown:\n\n";

  // Analyze top signals
  const sortedSignals = [...signals].sort((a, b) => b.score - a.score);
  const topSignals = sortedSignals.slice(0, 3);

  for (const signal of topSignals) {
    if (signal.score > 20) {
      analysis += `• ${signal.type.replace(/_/g, " ").toUpperCase()}: ${signal.detail} (Score: ${signal.score})\n`;
    }
  }

  if (reasons.length > 0) {
    analysis += `\nKey concerns:\n`;
    for (const reason of reasons.slice(0, 3)) {
      analysis += `• ${reason}\n`;
    }
  }

  return analysis;
}

function generateMockAction(input: LLMExplanationRequest): string {
  const { level } = input;

  const actions: Record<string, string> = {
    LOW: "No action required. Transaction can proceed normally.",
    MEDIUM: "Consider additional verification steps before processing.",
    HIGH: "Recommend manual review by fraud analyst before approval.",
    CRITICAL: "Immediate hold recommended. Escalate to senior fraud team.",
  };

  return actions[level] || "Review required.";
}

export interface PrecisionGuardrailConfig {
  minPrecision: number;
  minSamples: number;
  requireHumanReviewBelow: number;
}

const DEFAULT_CONFIG: PrecisionGuardrailConfig = {
  minPrecision: 0.95,
  minSamples: 100,
  requireHumanReviewBelow: 0.95,
};

export interface PrecisionMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  sampleSize: number;
  meetsThreshold: boolean;
}

export function calculatePrecisionMetrics(
  predictions: { predicted: boolean; actual: boolean }[]
): PrecisionMetrics {
  const truePositives = predictions.filter(
    (p) => p.predicted && p.actual
  ).length;
  const falsePositives = predictions.filter(
    (p) => p.predicted && !p.actual
  ).length;
  const falseNegatives = predictions.filter(
    (p) => !p.predicted && p.actual
  ).length;

  const precision =
    truePositives + falsePositives > 0
      ? truePositives / (truePositives + falsePositives)
      : 0;

  const recall =
    truePositives + falseNegatives > 0
      ? truePositives / (truePositives + falseNegatives)
      : 0;

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    precision,
    recall,
    sampleSize: predictions.length,
    meetsThreshold: precision >= DEFAULT_CONFIG.minPrecision,
  };
}

export function shouldAutomateAction(
  riskLevel: string,
  precisionMetrics: PrecisionMetrics
): { automate: boolean; reason: string } {
  // Always allow low-risk actions
  if (riskLevel === "LOW") {
    return { automate: true, reason: "Low risk - safe to automate" };
  }

  // Medium risk - always allow
  if (riskLevel === "MEDIUM") {
    return { automate: true, reason: "Medium risk - verification step" };
  }

  // High risk - check precision
  if (riskLevel === "HIGH") {
    if (!precisionMetrics.meetsThreshold) {
      return {
        automate: false,
        reason: `Precision ${(precisionMetrics.precision * 100).toFixed(1)}% is below ${(DEFAULT_CONFIG.minPrecision * 100)}% threshold`,
      };
    }

    if (precisionMetrics.sampleSize < DEFAULT_CONFIG.minSamples) {
      return {
        automate: false,
        reason: `Insufficient samples (${precisionMetrics.sampleSize}/${DEFAULT_CONFIG.minSamples})`,
      };
    }

    return {
      automate: true,
      reason: `Precision ${(precisionMetrics.precision * 100).toFixed(1)}% meets threshold`,
    };
  }

  // Critical risk - always require human review
  if (riskLevel === "CRITICAL") {
    return {
      automate: false,
      reason: "Critical risk - human review required",
    };
  }

  return { automate: false, reason: "Unknown risk level" };
}

export function getActionWithGuardrail(
  riskLevel: string,
  precisionMetrics: PrecisionMetrics
): {
  action: string;
  requiresHumanReview: boolean;
  reason: string;
} {
  const { automate, reason } = shouldAutomateAction(riskLevel, precisionMetrics);

  const actionMap: Record<string, string> = {
    LOW: "ALLOW",
    MEDIUM: "STEP_UP_VERIFICATION",
    HIGH: "HUMAN_REVIEW",
    CRITICAL: "PAYOUT_HOLD",
  };

  if (automate) {
    return {
      action: actionMap[riskLevel],
      requiresHumanReview: false,
      reason,
    };
  }

  // Force human review when guardrail blocks automation
  return {
    action: "HUMAN_REVIEW",
    requiresHumanReview: true,
    reason,
  };
}

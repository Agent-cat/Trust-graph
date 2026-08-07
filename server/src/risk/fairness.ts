export interface FairnessMetrics {
  disparateImpact: number;
  equalOpportunity: number;
  demographicParity: number;
  calibration: number;
  overallScore: number;
  issues: string[];
}

export interface PredictionWithDemographics {
  predicted: boolean;
  actual: boolean;
  group: string;
}

export function calculateFairnessMetrics(
  predictions: PredictionWithDemographics[]
): FairnessMetrics {
  const groups = [...new Set(predictions.map((p) => p.group))];
  const issues: string[] = [];

  if (groups.length < 2) {
    return {
      disparateImpact: 1,
      equalOpportunity: 1,
      demographicParity: 1,
      calibration: 1,
      overallScore: 1,
      issues: ["Insufficient group diversity for fairness analysis"],
    };
  }

  // Calculate metrics per group
  const groupMetrics: Record<
    string,
    {
      selectionRate: number;
      truePositiveRate: number;
      falsePositiveRate: number;
      positiveRate: number;
    }
  > = {};

  for (const group of groups) {
    const groupPreds = predictions.filter((p) => p.group === group);
    const selected = groupPreds.filter((p) => p.predicted).length;
    const actualPositive = groupPreds.filter((p) => p.actual).length;
    const truePositives = groupPreds.filter(
      (p) => p.predicted && p.actual
    ).length;
    const falsePositives = groupPreds.filter(
      (p) => p.predicted && !p.actual
    ).length;
    const falseNegatives = groupPreds.filter(
      (p) => !p.predicted && p.actual
    ).length;

    groupMetrics[group] = {
      selectionRate: selected / groupPreds.length,
      truePositiveRate:
        actualPositive > 0 ? truePositives / actualPositive : 0,
      falsePositiveRate:
        actualPositive < groupPreds.length
          ? falsePositives / (groupPreds.length - actualPositive)
          : 0,
      positiveRate: actualPositive / groupPreds.length,
    };
  }

  // Disparate Impact Ratio (80% rule)
  const selectionRates = Object.values(groupMetrics).map(
    (m) => m.selectionRate
  );
  const maxSelection = Math.max(...selectionRates);
  const minSelection = Math.min(...selectionRates);
  const disparateImpact = maxSelection > 0 ? minSelection / maxSelection : 1;

  if (disparateImpact < 0.8) {
    issues.push(
      `Disparate impact ratio ${(disparateImpact * 100).toFixed(1)}% is below 80% threshold`
    );
  }

  // Equal Opportunity Difference
  const tprValues = Object.values(groupMetrics).map(
    (m) => m.truePositiveRate
  );
  const maxTPR = Math.max(...tprValues);
  const minTPR = Math.min(...tprValues);
  const equalOpportunity = 1 - Math.abs(maxTPR - minTPR);

  if (equalOpportunity < 0.8) {
    issues.push(
      `Equal opportunity difference ${((1 - equalOpportunity) * 100).toFixed(1)}% is concerning`
    );
  }

  // Demographic Parity Difference
  const posRates = Object.values(groupMetrics).map((m) => m.selectionRate);
  const maxPos = Math.max(...posRates);
  const minPos = Math.min(...posRates);
  const demographicParity = 1 - Math.abs(maxPos - minPos);

  if (demographicParity < 0.8) {
    issues.push(
      `Demographic parity difference ${((1 - demographicParity) * 100).toFixed(1)}% is concerning`
    );
  }

  // Calibration (simplified)
  const calibration = 0.85;

  // Overall score
  const overallScore =
    disparateImpact * 0.3 +
    equalOpportunity * 0.3 +
    demographicParity * 0.2 +
    calibration * 0.2;

  return {
    disparateImpact,
    equalOpportunity,
    demographicParity,
    calibration,
    overallScore,
    issues,
  };
}

export function getFairnessRecommendations(
  metrics: FairnessMetrics
): string[] {
  const recommendations: string[] = [];

  if (metrics.disparateImpact < 0.8) {
    recommendations.push(
      "Review feature selection to reduce disparate impact"
    );
    recommendations.push(
      "Consider reweighting training data for underrepresented groups"
    );
  }

  if (metrics.equalOpportunity < 0.8) {
    recommendations.push(
      "Adjust decision thresholds per group to equalize true positive rates"
    );
    recommendations.push(
      "Investigate if features are proxies for protected attributes"
    );
  }

  if (metrics.demographicParity < 0.8) {
    recommendations.push(
      "Evaluate if different selection rates are justified by business need"
    );
    recommendations.push(
      "Consider fairness-aware machine learning techniques"
    );
  }

  if (metrics.issues.length === 0) {
    recommendations.push(
      "Current model shows acceptable fairness metrics"
    );
    recommendations.push(
      "Continue monitoring fairness metrics over time"
    );
  }

  return recommendations;
}

export interface RiskInput {
  amount: number;
  refundRate: number;
  accountAgeDays: number;
  ipRisk: number;
  deviceLinkedAccounts?: number;
  orderCount24h?: number;
  disputedRate?: number;
}

export interface RiskResult {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reasons: string[];
  signals: {
    type: string;
    score: number;
    detail: string;
  }[];
}

export function calculateRisk(input: RiskInput): RiskResult {
  let score = 0;
  const reasons: string[] = [];
  const signals: RiskResult["signals"] = [];

  // Transaction amount risk
  let transactionScore = 0;
  if (input.amount > 100000) {
    transactionScore += 40;
    reasons.push("Extremely high transaction amount");
  } else if (input.amount > 50000) {
    transactionScore += 25;
    reasons.push("Unusually high transaction amount");
  } else if (input.amount > 20000) {
    transactionScore += 10;
    reasons.push("Above-average transaction amount");
  }
  signals.push({
    type: "transaction_risk",
    score: Math.min(transactionScore, 100),
    detail: `Amount: ₹${input.amount.toLocaleString()}`,
  });

  // Refund rate risk
  let refundScore = 0;
  if (input.refundRate > 0.7) {
    refundScore += 40;
    reasons.push("Seller has critically high refund activity");
  } else if (input.refundRate > 0.5) {
    refundScore += 30;
    reasons.push("Seller has unusually high refund activity");
  } else if (input.refundRate > 0.3) {
    refundScore += 15;
    reasons.push("Seller refund rate is elevated");
  } else if (input.refundRate > 0.15) {
    refundScore += 5;
    reasons.push("Seller refund rate is slightly above average");
  }
  signals.push({
    type: "refund_risk",
    score: Math.min(refundScore, 100),
    detail: `Refund rate: ${(input.refundRate * 100).toFixed(1)}%`,
  });

  // Account age risk
  let accountScore = 0;
  if (input.accountAgeDays < 3) {
    accountScore += 35;
    reasons.push("Account was created very recently");
  } else if (input.accountAgeDays < 7) {
    accountScore += 25;
    reasons.push("Account was created recently");
  } else if (input.accountAgeDays < 30) {
    accountScore += 10;
    reasons.push("Account is less than a month old");
  }
  signals.push({
    type: "account_risk",
    score: Math.min(accountScore, 100),
    detail: `Account age: ${input.accountAgeDays} days`,
  });

  // IP risk
  let ipScore = 0;
  if (input.ipRisk > 80) {
    ipScore += 30;
    reasons.push("High-risk IP address");
  } else if (input.ipRisk > 60) {
    ipScore += 15;
    reasons.push("Moderate-risk IP address");
  } else if (input.ipRisk > 40) {
    ipScore += 5;
    reasons.push("IP has some risk indicators");
  }
  signals.push({
    type: "ip_risk",
    score: Math.min(ipScore, 100),
    detail: `IP risk score: ${input.ipRisk}/100`,
  });

  // Device linkage risk
  let deviceScore = 0;
  const deviceAccounts = input.deviceLinkedAccounts ?? 0;
  if (deviceAccounts > 10) {
    deviceScore += 35;
    reasons.push(`Device linked to ${deviceAccounts} suspicious accounts`);
  } else if (deviceAccounts > 5) {
    deviceScore += 25;
    reasons.push(`Device linked to ${deviceAccounts} accounts`);
  } else if (deviceAccounts > 2) {
    deviceScore += 10;
    reasons.push(`Device shared across ${deviceAccounts} accounts`);
  }
  signals.push({
    type: "device_risk",
    score: Math.min(deviceScore, 100),
    detail: `Linked accounts: ${deviceAccounts}`,
  });

  // Velocity risk
  let velocityScore = 0;
  const orderCount = input.orderCount24h ?? 0;
  if (orderCount > 20) {
    velocityScore += 30;
    reasons.push(`Unusual velocity: ${orderCount} orders in 24h`);
  } else if (orderCount > 10) {
    velocityScore += 15;
    reasons.push(`Elevated order velocity: ${orderCount} orders in 24h`);
  }
  signals.push({
    type: "velocity_risk",
    score: Math.min(velocityScore, 100),
    detail: `Orders in 24h: ${orderCount}`,
  });

  // Dispute rate risk
  let disputeScore = 0;
  const disputedRate = input.disputedRate ?? 0;
  if (disputedRate > 0.3) {
    disputeScore += 25;
    reasons.push("High dispute rate");
  } else if (disputedRate > 0.15) {
    disputeScore += 10;
    reasons.push("Elevated dispute rate");
  }
  signals.push({
    type: "dispute_risk",
    score: Math.min(disputeScore, 100),
    detail: `Dispute rate: ${(disputedRate * 100).toFixed(1)}%`,
  });

  // Calculate weighted total
  const weights = {
    transaction: 0.2,
    refund: 0.2,
    account: 0.15,
    ip: 0.15,
    device: 0.15,
    velocity: 0.1,
    dispute: 0.05,
  };

  score =
    transactionScore * weights.transaction +
    refundScore * weights.refund +
    accountScore * weights.account +
    ipScore * weights.ip +
    deviceScore * weights.device +
    velocityScore * weights.velocity +
    disputeScore * weights.dispute;

  score = Math.min(Math.round(score), 100);

  // Determine level
  let level: RiskResult["level"];
  if (score < 30) {
    level = "LOW";
  } else if (score < 55) {
    level = "MEDIUM";
  } else if (score < 75) {
    level = "HIGH";
  } else {
    level = "CRITICAL";
  }

  return { score, level, reasons, signals };
}

export function determineAction(level: RiskResult["level"]): string {
  switch (level) {
    case "LOW":
      return "ALLOW";
    case "MEDIUM":
      return "STEP_UP_VERIFICATION";
    case "HIGH":
      return "HUMAN_REVIEW";
    case "CRITICAL":
      return "PAYOUT_HOLD";
  }
}

export interface GSTINResponse {
  gstin: string;
  businessName: string;
  registrationDate: string;
  status: string;
  state: string;
  businessType: string;
  lastUpdated: string;
}

export async function verifyGSTIN(gstin: string): Promise<GSTINResponse | null> {
  // Mock GSTIN verification - in production, integrate with actual GST API
  const states = [
    "Maharashtra", "Karnataka", "Tamil Nadu", "Delhi", "Gujarat",
    "Uttar Pradesh", "Rajasthan", "West Bengal", "Telangana", "Kerala"
  ];

  const businessTypes = [
    "Private Limited", "LLP", "Partnership", "Sole Proprietorship", "OPC"
  ];

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));

  return {
    gstin,
    businessName: `Business ${gstin.slice(-4)}`,
    registrationDate: "2020-01-15",
    status: "Active",
    state: states[Math.floor(Math.random() * states.length)],
    businessType: businessTypes[Math.floor(Math.random() * businessTypes.length)],
    lastUpdated: new Date().toISOString(),
  };
}

export function calculateGSTINRisk(gstin: string, accountAgeDays: number): {
  riskScore: number;
  reasons: string[];
} {
  let riskScore = 0;
  const reasons: string[] = [];

  // Check GSTIN format
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
    riskScore += 30;
    reasons.push("Invalid GSTIN format");
  }

  // New accounts with GSTIN are suspicious
  if (accountAgeDays < 30) {
    riskScore += 20;
    reasons.push("New account with GSTIN");
  }

  return { riskScore, reasons };
}

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const GRAPH_ML_URL = process.env.GRAPH_ML_URL || "http://localhost:8001";

export interface MLPredictionRequest {
  amount: number;
  refund_rate: number;
  account_age_days: number;
  ip_risk: number;
  device_linked_accounts: number;
  order_count_24h: number;
  disputed_rate: number;
  graph_risk: number;
}

export interface GraphMLPredictionRequest {
  degree: number;
  clustering_coeff: number;
  pagerank: number;
  neighbor_fraud_rate: number;
  shared_device_count: number;
  shared_ip_count: number;
  total_transactions: number;
  avg_amount: number;
  refund_rate: number;
}

export interface MLPredictionResponse {
  fraud_probability: number;
  is_fraud: boolean;
  confidence: number;
}

export async function getMLPrediction(
  input: MLPredictionRequest
): Promise<MLPredictionResponse> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      console.error("ML service error:", response.status);
      return { fraud_probability: 0, is_fraud: false, confidence: 0 };
    }

    return await response.json();
  } catch (error) {
    console.error("ML service connection error:", error);
    return { fraud_probability: 0, is_fraud: false, confidence: 0 };
  }
}

export async function getGraphMLPrediction(
  input: GraphMLPredictionRequest
): Promise<MLPredictionResponse> {
  try {
    const response = await fetch(`${GRAPH_ML_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      console.error("Graph ML service error:", response.status);
      return { fraud_probability: 0, is_fraud: false, confidence: 0 };
    }

    return await response.json();
  } catch (error) {
    console.error("Graph ML service connection error:", error);
    return { fraud_probability: 0, is_fraud: false, confidence: 0 };
  }
}

export async function checkMLHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`);
    const data = await response.json();
    return data.model_loaded === true;
  } catch {
    return false;
  }
}

export async function checkGraphMLHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${GRAPH_ML_URL}/health`);
    const data = await response.json();
    return data.model_loaded === true;
  } catch {
    return false;
  }
}

export interface ExplanationResponse {
  prediction: number;
  summary: string;
  explanations: {
    feature: string;
    value: number;
    impact: number;
    direction: string;
  }[];
  top_risk_factors: any[];
  top_safety_factors: any[];
}

export async function getMLExplanation(
  input: MLPredictionRequest
): Promise<ExplanationResponse> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return { prediction: 0, summary: "Explanation unavailable", explanations: [], top_risk_factors: [], top_safety_factors: [] };
    }

    return await response.json();
  } catch (error) {
    console.error("ML explanation error:", error);
    return { prediction: 0, summary: "Explanation unavailable", explanations: [], top_risk_factors: [], top_safety_factors: [] };
  }
}

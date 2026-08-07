const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

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

export async function checkMLHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`);
    const data = await response.json();
    return data.model_loaded === true;
  } catch {
    return false;
  }
}

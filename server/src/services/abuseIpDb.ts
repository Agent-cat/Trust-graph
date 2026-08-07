const ABUSEIPDB_KEY = process.env.ABUSEIPDB_API_KEY || "";

export interface AbuseIPDBResponse {
  ipAddress: string;
  abuseConfidenceScore: number;
  countryCode: string;
  isp: string;
  domain: string;
  usageType: string;
  totalReports: number;
  lastReportedAt: string;
}

export async function checkIPReputation(ip: string): Promise<AbuseIPDBResponse | null> {
  if (!ABUSEIPDB_KEY) {
    // Return mock data if no API key
    return {
      ipAddress: ip,
      abuseConfidenceScore: Math.floor(Math.random() * 50),
      countryCode: "IN",
      isp: "Unknown ISP",
      domain: "unknown.com",
      usageType: "ISP",
      totalReports: Math.floor(Math.random() * 10),
      lastReportedAt: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}`,
      {
        headers: {
          Key: ABUSEIPDB_KEY,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("AbuseIPDB error:", response.status);
      return null;
    }

    const data = await response.json();
    return {
      ipAddress: data.data.ipAddress,
      abuseConfidenceScore: data.data.abuseConfidenceScore,
      countryCode: data.data.countryCode,
      isp: data.data.isp,
      domain: data.data.domain,
      usageType: data.data.usageType,
      totalReports: data.data.totalReports,
      lastReportedAt: data.data.lastReportedAt,
    };
  } catch (error) {
    console.error("AbuseIPDB connection error:", error);
    return null;
  }
}

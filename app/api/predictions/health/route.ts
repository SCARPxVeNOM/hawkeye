import { NextRequest } from "next/server"

const BENTOCLOUD_ENDPOINT = "https://failure-prediction-prod-0d460137.mt-guc1.bentoml.ai"

// GET /api/predictions/health - Check BentoCloud API health
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BENTOCLOUD_ENDPOINT}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const isHealthy = response.ok
    const statusText = response.statusText

    return Response.json({
      healthy: isHealthy,
      status: response.status,
      status_text: statusText,
      endpoint: BENTOCLOUD_ENDPOINT,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Error checking BentoCloud health:", error)
    return Response.json({
      healthy: false,
      error: error.message || "Failed to check BentoCloud health",
      endpoint: BENTOCLOUD_ENDPOINT,
      timestamp: new Date().toISOString(),
    }, { status: 503 })
  }
}


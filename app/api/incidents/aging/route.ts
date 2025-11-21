import { NextRequest } from "next/server"
import { analyzeIncidentAging } from "@/lib/services/aging-analysis.service"

// GET /api/incidents/aging - Get aging analysis
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const category = searchParams.get("category")

    const analysis = await analyzeIncidentAging({
      status: status || undefined,
      category: category || undefined,
    })

    return Response.json(analysis)
  } catch (error: any) {
    console.error("Error analyzing incident aging:", error)
    return Response.json(
      { error: error.message || "Failed to analyze aging" },
      { status: 500 }
    )
  }
}


import { NextRequest } from "next/server"
import { generateAndSavePredictions, getPredictions } from "@/lib/services/prediction.service"

// GET /api/predictions - Get all predictions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "10")

    const predictions = await getPredictions(limit)
    return Response.json(predictions)
  } catch (error: any) {
    console.error("Error fetching predictions:", error)
    // Return empty array instead of error to prevent frontend errors
    return Response.json([])
  }
}

// POST /api/predictions - Generate new predictions
export async function POST(request: Request) {
  try {
    const predictions = await generateAndSavePredictions()
    return Response.json(predictions, { status: 201 })
  } catch (error: any) {
    console.error("Error generating predictions:", error)
    return Response.json({ error: error.message || "Failed to generate predictions" }, { status: 500 })
  }
}


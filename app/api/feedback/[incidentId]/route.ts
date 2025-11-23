import { NextRequest } from "next/server"
import { getIncidentFeedback } from "@/lib/services/feedback.service"

// GET /api/feedback/[incidentId] - Get feedback for a specific incident
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  try {
    const { incidentId } = await params
    const feedback = await getIncidentFeedback(incidentId)

    if (!feedback) {
      return Response.json({ error: "Feedback not found" }, { status: 404 })
    }

    return Response.json(feedback)
  } catch (error: any) {
    console.error("Error fetching feedback:", error)
    return Response.json(
      { error: error.message || "Failed to fetch feedback" },
      { status: 500 }
    )
  }
}



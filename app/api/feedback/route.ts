import { NextRequest } from "next/server"
import { createFeedback, getTechnicianFeedback } from "@/lib/services/feedback.service"

// POST /api/feedback - Create new feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { incident_id, technician_id, user_id, rating, comment } = body

    if (!incident_id || !technician_id || !user_id || !rating) {
      return Response.json(
        { error: "Missing required fields: incident_id, technician_id, user_id, rating" },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return Response.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      )
    }

    const feedback = await createFeedback({
      incident_id,
      technician_id,
      user_id,
      rating,
      comment: comment || "",
    })

    return Response.json(feedback, { status: 201 })
  } catch (error: any) {
    console.error("Error creating feedback:", error)
    
    if (error.message.includes("already submitted")) {
      return Response.json({ error: error.message }, { status: 409 })
    }
    
    return Response.json(
      { error: error.message || "Failed to create feedback" },
      { status: 500 }
    )
  }
}

// GET /api/feedback - Get feedback for a technician
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const technicianId = searchParams.get("technicianId")

    if (!technicianId) {
      return Response.json(
        { error: "technicianId parameter is required" },
        { status: 400 }
      )
    }

    const feedbacks = await getTechnicianFeedback(technicianId)
    return Response.json(feedbacks)
  } catch (error: any) {
    console.error("Error fetching feedback:", error)
    return Response.json(
      { error: error.message || "Failed to fetch feedback" },
      { status: 500 }
    )
  }
}



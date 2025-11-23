import { NextRequest } from "next/server"
import { getMLPrediction } from "@/lib/services/prediction.service"
import { getIncidentById } from "@/lib/services/incident.service"

// POST /api/predictions/ml - Get ML prediction for a specific incident
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { incident_id } = body

    if (!incident_id) {
      return Response.json(
        { error: "incident_id is required" },
        { status: 400 }
      )
    }

    // Get the incident
    const incident = await getIncidentById(incident_id)
    if (!incident) {
      return Response.json(
        { error: "Incident not found" },
        { status: 404 }
      )
    }

    // Get ML prediction
    const prediction = await getMLPrediction(incident)
    
    if (!prediction) {
      return Response.json(
        { error: "Failed to get ML prediction. BentoCloud API may be unavailable." },
        { status: 503 }
      )
    }

    return Response.json({
      incident_id: incident_id,
      incident_location: incident.location,
      incident_category: incident.category,
      prediction: prediction.prediction,
      days_to_next_failure: prediction.days_to_next_failure,
      model_info: prediction.model_info,
    })
  } catch (error: any) {
    console.error("Error getting ML prediction:", error)
    return Response.json(
      { error: error.message || "Failed to get ML prediction" },
      { status: 500 }
    )
  }
}


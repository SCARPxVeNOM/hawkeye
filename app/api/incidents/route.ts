import { NextRequest } from "next/server"
import { getIncidents, createIncident } from "@/lib/services/incident.service"
import { notifyNewComplaint } from "@/lib/services/notification.service"
import { checkIncidentCreationRateLimit } from "@/lib/middleware/rate-limit"
import { validateGPSCoordinates, validateLocationString } from "@/lib/utils/location-validator"
import { createIncidentUpdate } from "@/lib/services/incident-updates.service"

// GET /api/incidents - Get all incidents or filter by user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const status = searchParams.get("status")
    const category = searchParams.get("category")
    const assignedTo = searchParams.get("assignedTo")

    const incidents = await getIncidents({
      userId: userId || undefined,
      status: status || undefined,
      category: category || undefined,
      assignedTo: assignedTo || undefined,
    })

    return Response.json(incidents)
  } catch (error: any) {
    console.error("Error fetching incidents:", error)
    // Return empty array instead of error to prevent frontend errors
    return Response.json([])
  }
}

// POST /api/incidents - Create a new incident
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { user_id, title, category, description, image_url, location, latitude, longitude } = body

    // Rate limiting check
    const rateLimit = await checkIncidentCreationRateLimit(user_id)
    if (!rateLimit.allowed) {
      return Response.json(
        {
          error: `Rate limit exceeded. You can create ${rateLimit.remaining} more incidents after ${new Date(rateLimit.resetAt).toLocaleString()}`,
        },
        { status: 429 }
      )
    }

    // Validate location string
    const locationValidation = validateLocationString(location)
    if (!locationValidation.valid) {
      return Response.json({ error: locationValidation.error }, { status: 400 })
    }

    // Validate GPS coordinates if provided
    if (latitude || longitude) {
      const gpsValidation = validateGPSCoordinates(latitude, longitude)
      if (!gpsValidation.valid) {
        return Response.json({ error: gpsValidation.error }, { status: 400 })
      }
    }

    const incident = await createIncident({
      user_id,
      title,
      category,
      description,
      image_url: image_url || null,
      location,
      latitude: latitude || null,
      longitude: longitude || null,
    })

    // Create initial incident update
    try {
      await createIncidentUpdate({
        incident_id: incident.id!,
        user_id,
        status: "new",
        comment: "Incident created",
      })
    } catch (updateError) {
      console.error("Failed to create incident update:", updateError)
    }

    // Send notification to user
    try {
      await notifyNewComplaint(user_id, incident.id!, title)
    } catch (notifError) {
      console.error("Failed to send notification:", notifError)
      // Don't fail the request if notification fails
    }

    return Response.json(incident, { status: 201 })
  } catch (error: any) {
    console.error("Error creating incident:", error)
    
    // Handle specific error types
    if (error.message.includes("Missing required fields")) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    if (error.message.includes("already exists")) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    
    return Response.json({ error: error.message || "Failed to create incident" }, { status: 500 })
  }
}


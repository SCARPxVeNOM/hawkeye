import { NextRequest } from "next/server"
import { getIncidentUpdates, createIncidentUpdate } from "@/lib/services/incident-updates.service"

// GET /api/incidents/[id]/updates - Get all updates for an incident
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updates = await getIncidentUpdates(id)
    return Response.json(updates)
  } catch (error: any) {
    console.error("Error fetching incident updates:", error)
    return Response.json({ error: error.message || "Failed to fetch updates" }, { status: 500 })
  }
}

// POST /api/incidents/[id]/updates - Create a new update
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { user_id, status, comment } = body

    if (!user_id || !status) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    const update = await createIncidentUpdate({
      incident_id: id,
      user_id,
      status,
      comment,
    })

    return Response.json(update, { status: 201 })
  } catch (error: any) {
    console.error("Error creating incident update:", error)
    return Response.json({ error: error.message || "Failed to create update" }, { status: 500 })
  }
}


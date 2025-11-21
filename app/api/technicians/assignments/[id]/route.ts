import { NextRequest } from "next/server"
import { updateScheduleStatus } from "@/lib/services/technician.service"

// PATCH /api/technicians/assignments/[id] - Update assignment status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !["scheduled", "in-progress", "completed", "cancelled"].includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 })
    }

    await updateScheduleStatus(id, status as any)

    return Response.json({ message: "Assignment updated successfully" })
  } catch (error: any) {
    console.error("Error updating assignment:", error)
    return Response.json(
      { error: error.message || "Failed to update assignment" },
      { status: 500 }
    )
  }
}


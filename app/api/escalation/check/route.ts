import { checkAndEscalateSLA, autoRescheduleUnavailableTechnicians } from "@/lib/services/escalation.service"

// POST /api/escalation/check - Check and escalate SLA breaches
export async function POST() {
  try {
    const escalatedCount = await checkAndEscalateSLA()
    const rescheduledCount = await autoRescheduleUnavailableTechnicians()

    return Response.json({
      escalated: escalatedCount,
      rescheduled: rescheduledCount,
      message: `Escalated ${escalatedCount} incidents and rescheduled ${rescheduledCount} assignments`,
    })
  } catch (error: any) {
    console.error("Error checking escalations:", error)
    return Response.json(
      { error: error.message || "Failed to check escalations" },
      { status: 500 }
    )
  }
}


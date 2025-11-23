import { NextRequest } from "next/server"
import { getPredictions } from "@/lib/services/prediction.service"
import { processCriticalAlerts } from "@/lib/services/critical-alert-assignment.service"

// POST /api/predictions/process-critical - Process existing critical alerts and assign them
export async function POST(request: NextRequest) {
  try {
    // Get all predictions
    const predictions = await getPredictions(100)
    
    // Filter critical alerts (days_to_next_failure < 30)
    const criticalAlerts = predictions.filter(
      (p) => p.days_to_next_failure !== undefined && p.days_to_next_failure < 30
    )
    
    if (criticalAlerts.length === 0) {
      return Response.json({
        message: "No critical alerts found",
        assigned: 0,
        failed: 0,
        results: [],
      })
    }
    
    console.log(`Processing ${criticalAlerts.length} critical alerts for assignment...`)
    
    // Process and assign critical alerts
    const assignmentResults = await processCriticalAlerts(
      criticalAlerts.map((p) => ({
        location: p.location,
        category: p.category,
        days_to_next_failure: p.days_to_next_failure || 0,
        confidence: p.confidence,
        message: p.message,
      }))
    )
    
    console.log(`Assignment complete: ${assignmentResults.assigned} assigned, ${assignmentResults.failed} failed`)
    
    return Response.json({
      message: `Processed ${criticalAlerts.length} critical alerts`,
      assigned: assignmentResults.assigned,
      failed: assignmentResults.failed,
      results: assignmentResults.results,
    })
  } catch (error: any) {
    console.error("Error processing critical alerts:", error)
    return Response.json(
      { error: error.message || "Failed to process critical alerts" },
      { status: 500 }
    )
  }
}


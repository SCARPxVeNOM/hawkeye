import { NextRequest } from "next/server"
import { 
  generateAndSavePredictions, 
  getPredictions, 
  getMLPrediction,
  generateMLPredictions 
} from "@/lib/services/prediction.service"
import { getIncidentById } from "@/lib/services/incident.service"
import { processCriticalAlerts } from "@/lib/services/critical-alert-assignment.service"

// GET /api/predictions - Get all predictions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "10")
    const mlOnly = searchParams.get("ml_only") === "true"

    if (mlOnly) {
      // Return only ML-based predictions
      const mlPredictions = await generateMLPredictions(limit)
      return Response.json(mlPredictions)
    }

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
    const body = await request.json().catch(() => ({}))
    const useML = body.use_ml !== false // Default to true, can be disabled
    const autoAssign = body.auto_assign !== false // Default to true

    const predictions = await generateAndSavePredictions(useML)
    
    // Process critical alerts with quality gates and auto-assign to technicians
    if (autoAssign) {
      // Filter alerts that pass initial quality gates (days <= 20, not 30)
      const criticalAlerts = predictions.filter(
        (p: any) => 
          p.days_to_next_failure !== undefined && 
          p.days_to_next_failure <= 20 && // Stricter threshold
          (p.confidence === undefined || p.confidence >= 80) // Confidence check
      )
      
      if (criticalAlerts.length > 0) {
        try {
          const assignmentResults = await processCriticalAlerts(
            criticalAlerts.map((p: any) => ({
              location: p.location,
              category: p.category,
              days_to_next_failure: p.days_to_next_failure || 0,
              confidence: p.confidence,
              message: p.message,
              model_r2: p.model_r2 || p.model_info?.test_r2 ? parseFloat(p.model_info?.test_r2 || "0") : undefined,
            }))
          )
          
          console.log(
            `Auto-assignment results: ${assignmentResults.assigned} assigned, ` +
            `${assignmentResults.filtered} filtered (quality gates), ` +
            `${assignmentResults.failed} failed`
          )
          
          // Include assignment results in response
          return Response.json({
            predictions,
            assignments: {
              total_critical: criticalAlerts.length,
              assigned: assignmentResults.assigned,
              filtered: assignmentResults.filtered,
              failed: assignmentResults.failed,
              results: assignmentResults.results,
            },
          }, { status: 201 })
        } catch (assignmentError: any) {
          console.error("Error auto-assigning critical alerts:", assignmentError)
          // Continue even if assignment fails
        }
      }
    }
    
    return Response.json(predictions, { status: 201 })
  } catch (error: any) {
    console.error("Error generating predictions:", error)
    return Response.json({ error: error.message || "Failed to generate predictions" }, { status: 500 })
  }
}


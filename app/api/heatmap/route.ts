import { NextRequest } from "next/server"
import { getIncidents } from "@/lib/services/incident.service"
import { getPredictions } from "@/lib/services/prediction.service"

export interface HeatmapDataPoint {
  location: string
  category: string
  intensity: number // 0-100, based on incident count + prediction confidence
  incidentCount: number
  predictionCount: number
  avgDaysToFailure?: number
}

export interface HeatmapResponse {
  data: HeatmapDataPoint[]
  maxIntensity: number
  locations: string[]
  categories: string[]
  lastUpdated: string
}

/**
 * GET /api/heatmap - Get heatmap data for issue hotspots
 * 
 * Query parameters:
 * - timeWindow: "24h" | "7d" | "30d" | "all" (default: "7d")
 * - includePredictions: "true" | "false" (default: "true")
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeWindow = searchParams.get("timeWindow") || "7d"
    const includePredictions = searchParams.get("includePredictions") !== "false"

    // Get all incidents
    const incidents = await getIncidents()
    
    // Filter by time window
    const now = new Date()
    let cutoffDate = new Date()
    
    switch (timeWindow) {
      case "24h":
        cutoffDate.setHours(now.getHours() - 24)
        break
      case "7d":
        cutoffDate.setDate(now.getDate() - 7)
        break
      case "30d":
        cutoffDate.setDate(now.getDate() - 30)
        break
      case "all":
        cutoffDate = new Date(0) // Beginning of time
        break
    }

    const filteredIncidents = incidents.filter((inc) => {
      const createdDate = new Date(inc.created_at)
      return createdDate >= cutoffDate
    })

    // Get predictions if enabled
    let predictions: any[] = []
    if (includePredictions) {
      try {
        predictions = await getPredictions(50) // Get more predictions for heatmap
      } catch (error) {
        console.error("Error fetching predictions for heatmap:", error)
      }
    }

    // Aggregate data by location and category
    const locationCategoryMap = new Map<string, {
      incidentCount: number
      predictionCount: number
      totalDaysToFailure: number
      failureCount: number
    }>()

    // Count incidents
    filteredIncidents.forEach((incident) => {
      const key = `${incident.location}|${incident.category}`
      const existing = locationCategoryMap.get(key) || {
        incidentCount: 0,
        predictionCount: 0,
        totalDaysToFailure: 0,
        failureCount: 0,
      }
      existing.incidentCount++
      locationCategoryMap.set(key, existing)
    })

    // Add predictions
    predictions.forEach((prediction) => {
      const key = `${prediction.location}|${prediction.category}`
      const existing = locationCategoryMap.get(key) || {
        incidentCount: 0,
        predictionCount: 0,
        totalDaysToFailure: 0,
        failureCount: 0,
      }
      existing.predictionCount++
      
      // If ML prediction with days_to_next_failure, track it
      if (prediction.days_to_next_failure !== undefined && prediction.days_to_next_failure !== null) {
        existing.totalDaysToFailure += prediction.days_to_next_failure
        existing.failureCount++
      }
      
      locationCategoryMap.set(key, existing)
    })

    // Convert to heatmap data points
    const dataPoints: HeatmapDataPoint[] = []
    let maxIntensity = 0

    locationCategoryMap.forEach((value, key) => {
      const [location, category] = key.split("|")
      
      // Calculate intensity:
      // - Base: incident count (0-50 points)
      // - Prediction weight: prediction count * 10 (0-30 points)
      // - Urgency: if days_to_failure < 30, add 20 points
      let intensity = Math.min(value.incidentCount * 5, 50)
      intensity += Math.min(value.predictionCount * 10, 30)
      
      const avgDaysToFailure = value.failureCount > 0
        ? value.totalDaysToFailure / value.failureCount
        : undefined
      
      if (avgDaysToFailure !== undefined && avgDaysToFailure < 30) {
        intensity += 20 // High urgency
      } else if (avgDaysToFailure !== undefined && avgDaysToFailure < 60) {
        intensity += 10 // Medium urgency
      }

      // Normalize to 0-100
      intensity = Math.min(intensity, 100)
      maxIntensity = Math.max(maxIntensity, intensity)

      dataPoints.push({
        location,
        category,
        intensity: Math.round(intensity),
        incidentCount: value.incidentCount,
        predictionCount: value.predictionCount,
        avgDaysToFailure: avgDaysToFailure ? Math.round(avgDaysToFailure * 10) / 10 : undefined,
      })
    })

    // Get unique locations and categories, ensuring they're strings and sorted
    const locations = Array.from(new Set(dataPoints.map((d) => String(d.location).trim())))
      .filter(loc => loc && loc.length > 0)
      .sort()
    const categories = Array.from(new Set(dataPoints.map((d) => String(d.category).trim())))
      .filter(cat => cat && cat.length > 0)
      .sort()

    return Response.json({
      data: dataPoints,
      maxIntensity: maxIntensity || 100, // Avoid division by zero
      locations,
      categories,
      lastUpdated: new Date().toISOString(),
    } as HeatmapResponse)
  } catch (error: any) {
    console.error("Error generating heatmap data:", error)
    return Response.json(
      { error: error.message || "Failed to generate heatmap data" },
      { status: 500 }
    )
  }
}


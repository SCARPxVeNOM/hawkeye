/**
 * Prediction Service
 * Handles incident prediction logic based on historical data
 */

import { getDb } from "@/lib/mongodb"
import { getIncidents } from "./incident.service"

export interface Prediction {
  id?: string
  location: string
  category: string
  confidence: number // 0-100
  message: string
  predicted_time?: Date | string
  created_at?: Date | string
}

export interface PredictionResult {
  location: string
  category: string
  confidence: number
  message: string
}

/**
 * Generate predictions based on frequency analysis
 */
export async function generateFrequencyBasedPredictions(
  limit: number = 5
): Promise<PredictionResult[]> {
  const incidents = await getIncidents()

  // Count incidents by location and category
  const locationMap: Record<string, number> = {}
  const categoryMap: Record<string, number> = {}
  const locationCategoryMap: Record<string, Record<string, number>> = {}

  incidents.forEach((incident) => {
    // Location frequency
    locationMap[incident.location] = (locationMap[incident.location] || 0) + 1

    // Category frequency
    categoryMap[incident.category] = (categoryMap[incident.category] || 0) + 1

    // Location-Category combination
    if (!locationCategoryMap[incident.location]) {
      locationCategoryMap[incident.location] = {}
    }
    locationCategoryMap[incident.location][incident.category] =
      (locationCategoryMap[incident.location][incident.category] || 0) + 1
  })

  // Generate predictions for top locations
  const topLocations = Object.entries(locationMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  return topLocations.map(([location, count]) => {
    // Find most common category for this location
    const locationCategories = locationCategoryMap[location] || {}
    const topCategory = Object.entries(locationCategories)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 
      Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 
      "general"

    // Calculate confidence based on frequency
    // More incidents = higher confidence
    const confidence = Math.min(50 + count * 10, 95)

    // Generate message
    const message = count > 3
      ? `High chance of recurring ${topCategory} issues in ${location} based on ${count} historical incidents`
      : `Potential ${topCategory} issues in ${location} based on ${count} past incidents`

    return {
      location,
      category: topCategory,
      confidence,
      message,
    }
  })
}

/**
 * Generate rule-based predictions
 */
export async function generateRuleBasedPredictions(): Promise<PredictionResult[]> {
  const incidents = await getIncidents()
  const predictions: PredictionResult[] = []

  // Rule 1: Locations with 3+ incidents in last 7 days are high risk
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentIncidents = incidents.filter((inc) => {
    const createdDate = new Date(inc.created_at)
    return createdDate >= sevenDaysAgo
  })

  const recentLocationCount: Record<string, number> = {}
  recentIncidents.forEach((inc) => {
    recentLocationCount[inc.location] = (recentLocationCount[inc.location] || 0) + 1
  })

  Object.entries(recentLocationCount).forEach(([location, count]) => {
    if (count >= 3) {
      // Find most common category for this location in recent incidents
      const locationRecent = recentIncidents.filter((inc) => inc.location === location)
      const categoryCount: Record<string, number> = {}
      locationRecent.forEach((inc) => {
        categoryCount[inc.category] = (categoryCount[inc.category] || 0) + 1
      })
      const topCategory = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "general"

      predictions.push({
        location,
        category: topCategory,
        confidence: Math.min(70 + count * 5, 95),
        message: `High risk: ${count} incidents in ${location} in the last 7 days`,
      })
    }
  })

  return predictions
}

/**
 * Save prediction to database
 */
export async function savePrediction(prediction: PredictionResult): Promise<Prediction> {
  const db = await getDb()
  const predictionsCollection = db.collection("predictions")

  const newPrediction = {
    location: prediction.location,
    category: prediction.category,
    confidence_score: prediction.confidence / 100, // Store as decimal 0-1
    alert_message: prediction.message,
    predicted_time: null, // Can be enhanced with time-based predictions
    created_at: new Date(),
  }

  const result = await predictionsCollection.insertOne(newPrediction)

  return {
    id: result.insertedId.toString(),
    location: newPrediction.location,
    category: newPrediction.category,
    confidence: prediction.confidence,
    message: newPrediction.alert_message,
    created_at: newPrediction.created_at.toISOString(),
  }
}

/**
 * Get all saved predictions
 */
export async function getPredictions(limit: number = 10): Promise<Prediction[]> {
  try {
    const db = await getDb()
    const predictionsCollection = db.collection("predictions")

    const predictions = await predictionsCollection
      .find({})
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray()

    return predictions.map((pred: any) => ({
      id: pred._id.toString(),
      location: pred.location,
      category: pred.category,
      confidence: (pred.confidence_score || 0) * 100, // Convert back to 0-100
      message: pred.alert_message,
      predicted_time: pred.predicted_time ? pred.predicted_time.toISOString() : null,
      created_at: pred.created_at.toISOString(),
    }))
  } catch (error) {
    console.error("Error getting predictions from database:", error)
    // Return empty array if database access fails
    return []
  }
}

/**
 * Generate and save predictions (main function)
 */
export async function generateAndSavePredictions(): Promise<PredictionResult[]> {
  // Generate predictions using frequency-based method
  const frequencyPredictions = await generateFrequencyBasedPredictions(5)

  // Generate predictions using rule-based method
  const rulePredictions = await generateRuleBasedPredictions()

  // Combine and deduplicate predictions
  const allPredictions = [...frequencyPredictions, ...rulePredictions]
  const uniquePredictions = new Map<string, PredictionResult>()

  allPredictions.forEach((pred) => {
    const key = `${pred.location}-${pred.category}`
    const existing = uniquePredictions.get(key)
    
    if (!existing || pred.confidence > existing.confidence) {
      uniquePredictions.set(key, pred)
    }
  })

  const finalPredictions = Array.from(uniquePredictions.values())

  // Save top predictions to database
  for (const prediction of finalPredictions.slice(0, 10)) {
    try {
      await savePrediction(prediction)
    } catch (error) {
      console.error("Error saving prediction:", error)
    }
  }

  return finalPredictions
}


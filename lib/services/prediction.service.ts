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
export async function generateAndSavePredictions(useML: boolean = false): Promise<any[]> {
  if (useML) {
    // Use ML-based predictions
    const mlPredictions = await generateMLPredictions(20)
    
    // Save ML predictions to database
    for (const prediction of mlPredictions) {
      try {
        await savePrediction({
          location: prediction.location,
          category: prediction.category,
          confidence: prediction.confidence,
          message: prediction.message,
        })
      } catch (error) {
        console.error("Error saving ML prediction:", error)
      }
    }
    
    return mlPredictions
  }
  
  // Use rule-based predictions (original logic)
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

// BentoCloud ML Prediction Integration
const BENTOCLOUD_ENDPOINT = "https://failure-prediction-prod-0d460137.mt-guc1.bentoml.ai"

export type BentoCloudPredictionRequest = {
  location: string
  category: string
  equipment_age_days: number
  manufacturer: string
  model: string
  last_maintenance_days_ago: number
  operating_hours: number
  temperature_celsius: number
  humidity_percent: number
  vibration_level: number
  power_consumption_kw: number
}

export type BentoCloudPredictionResponse = {
  prediction: number
  days_to_next_failure: number
  model_info: {
    validation_r2: string
    test_r2: string
  }
}

/**
 * Map incident to BentoCloud API format
 */
function mapIncidentToBentoCloudFormat(incident: any): BentoCloudPredictionRequest {
  // Generate synthetic data for fields not available in incident
  const equipmentAge = Math.floor(Math.random() * 3650) + 30 // 30 days to 10 years
  const lastMaintenance = Math.floor(Math.random() * 180) + 7 // 7 to 187 days ago
  const operatingHours = Math.floor(Math.random() * 8760) + 1000 // 1000 to 8760 hours
  
  // Category-based defaults
  const categoryDefaults: Record<string, { temp: number; humidity: number; vibration: number; power: number }> = {
    electricity: { temp: 25, humidity: 50, vibration: 2.5, power: 5.0 },
    water: { temp: 20, humidity: 60, vibration: 1.5, power: 2.0 },
    it: { temp: 22, humidity: 45, vibration: 0.5, power: 0.5 },
    hostel: { temp: 24, humidity: 55, vibration: 2.0, power: 3.0 },
    garbage: { temp: 28, humidity: 70, vibration: 3.0, power: 1.5 },
  }
  
  const defaults = categoryDefaults[incident.category.toLowerCase()] || categoryDefaults.electricity
  
  return {
    location: incident.location,
    category: incident.category,
    equipment_age_days: equipmentAge,
    manufacturer: "Generic",
    model: "Standard",
    last_maintenance_days_ago: lastMaintenance,
    operating_hours: operatingHours,
    temperature_celsius: defaults.temp + (Math.random() * 10 - 5), // ±5°C variation
    humidity_percent: defaults.humidity + (Math.random() * 20 - 10), // ±10% variation
    vibration_level: defaults.vibration + (Math.random() * 1 - 0.5), // ±0.5 variation
    power_consumption_kw: defaults.power + (Math.random() * 2 - 1), // ±1kW variation
  }
}

/**
 * Get ML prediction for a single incident from BentoCloud
 */
export async function getMLPrediction(incident: any): Promise<BentoCloudPredictionResponse | null> {
  try {
    const requestData = mapIncidentToBentoCloudFormat(incident)
    
    const response = await fetch(`${BENTOCLOUD_ENDPOINT}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      console.error(`BentoCloud API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    
    // Map response to our interface (handle r² vs r2)
    return {
      prediction: data.prediction || 0,
      days_to_next_failure: data.days_to_next_failure || 30,
      model_info: {
        validation_r2: data.model_info?.validation_r2 || data.model_info?.["validation_r²"] || "0",
        test_r2: data.model_info?.test_r2 || data.model_info?.["test_r²"] || "0",
      },
    }
  } catch (error) {
    console.error("Error calling BentoCloud API:", error)
    return null
  }
}

/**
 * Generate ML predictions for multiple incidents
 */
export async function generateMLPredictions(limit: number = 10): Promise<any[]> {
  try {
    const incidents = await getIncidents({ limit })
    
    const predictions = await Promise.all(
      incidents.map(async (incident) => {
        const mlPrediction = await getMLPrediction(incident)
        
        if (!mlPrediction) {
          return null
        }

        // Calculate confidence based on model R² and days to failure
        const testR2 = parseFloat(mlPrediction.model_info.test_r2) || 0
        const confidence = Math.min(100, Math.max(50, testR2 * 100))
        
        // Determine urgency message
        let message = ""
        if (mlPrediction.days_to_next_failure <= 7) {
          message = `CRITICAL: Failure predicted within ${mlPrediction.days_to_next_failure} days at ${incident.location}`
        } else if (mlPrediction.days_to_next_failure <= 20) {
          message = `HIGH RISK: Failure predicted within ${mlPrediction.days_to_next_failure} days at ${incident.location}`
        } else {
          message = `MODERATE RISK: Failure predicted within ${mlPrediction.days_to_next_failure} days at ${incident.location}`
        }

        return {
          id: incident.id,
          location: incident.location,
          category: incident.category,
          confidence: Math.round(confidence),
          message,
          days_to_next_failure: mlPrediction.days_to_next_failure,
          prediction: mlPrediction.prediction,
          model_r2: testR2,
          model_info: mlPrediction.model_info,
          created_at: new Date().toISOString(),
        }
      })
    )

    // Filter out null predictions (failed API calls)
    return predictions.filter((p): p is any => p !== null)
  } catch (error) {
    console.error("Error generating ML predictions:", error)
    return []
  }
}


/**
 * Aging Analysis Service
 * Analyzes complaint aging and time-based metrics
 */

import { getIncidents } from "./incident.service"

export interface AgingBucket {
  range: string
  count: number
  incidents: any[]
}

export interface AgingAnalysis {
  buckets: AgingBucket[]
  average_age: number // in minutes
  oldest_incident_age: number // in minutes
  sla_breaches: number
  at_risk: number // incidents approaching SLA
}

const SLA_MINUTES = 15
const WARNING_THRESHOLD = 0.8 // 80% of SLA

/**
 * Analyze incident aging
 */
export async function analyzeIncidentAging(
  filters?: { status?: string; category?: string }
): Promise<AgingAnalysis> {
  const incidents = await getIncidents(filters)

  const now = new Date()
  const ages: number[] = []
  let slaBreaches = 0
  let atRisk = 0

  // Define aging buckets (in minutes)
  const buckets: { range: string; min: number; max: number }[] = [
    { range: "0-5 min", min: 0, max: 5 },
    { range: "5-10 min", min: 5, max: 10 },
    { range: "10-15 min", min: 10, max: 15 },
    { range: "15-30 min", min: 15, max: 30 },
    { range: "30-60 min", min: 30, max: 60 },
    { range: "1-2 hours", min: 60, max: 120 },
    { range: "2-4 hours", min: 120, max: 240 },
    { range: "4+ hours", min: 240, max: Infinity },
  ]

  const bucketCounts: Record<string, any[]> = {}
  buckets.forEach((bucket) => {
    bucketCounts[bucket.range] = []
  })

  incidents.forEach((incident) => {
    const createdTime = new Date(incident.created_at)
    const ageMinutes = Math.floor(
      (now.getTime() - createdTime.getTime()) / 60000
    )

    ages.push(ageMinutes)

    // Check SLA breach
    if (ageMinutes > SLA_MINUTES) {
      slaBreaches++
    }

    // Check at risk (80% of SLA)
    if (ageMinutes >= SLA_MINUTES * WARNING_THRESHOLD && ageMinutes <= SLA_MINUTES) {
      atRisk++
    }

    // Categorize into buckets
    for (const bucket of buckets) {
      if (ageMinutes >= bucket.min && ageMinutes < bucket.max) {
        bucketCounts[bucket.range].push(incident)
        break
      }
    }
  })

  const averageAge =
    ages.length > 0
      ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length)
      : 0

  const oldestAge = ages.length > 0 ? Math.max(...ages) : 0

  const agingBuckets: AgingBucket[] = buckets.map((bucket) => ({
    range: bucket.range,
    count: bucketCounts[bucket.range].length,
    incidents: bucketCounts[bucket.range],
  }))

  return {
    buckets: agingBuckets,
    average_age: averageAge,
    oldest_incident_age: oldestAge,
    sla_breaches: slaBreaches,
    at_risk: atRisk,
  }
}


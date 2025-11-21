/**
 * Priority Service
 * Handles automatic priority detection based on keywords and severity
 */

export interface PriorityResult {
  priority: number // 1-5, where 5 is highest
  reason: string
}

const HIGH_PRIORITY_KEYWORDS = [
  "urgent", "critical", "emergency", "immediate", "asap", "fire", "flood",
  "leak", "broken", "down", "outage", "failure", "dangerous", "hazard",
  "unsafe", "blocked", "stuck", "trapped", "injured", "accident"
]

const MEDIUM_PRIORITY_KEYWORDS = [
  "important", "soon", "quickly", "problem", "issue", "not working",
  "damaged", "faulty", "malfunction", "disruption", "inconvenience"
]

const LOW_PRIORITY_KEYWORDS = [
  "minor", "small", "cosmetic", "suggestion", "improvement", "enhancement",
  "nice to have", "when possible", "eventually"
]

/**
 * Detect priority based on title and description
 */
export function detectPriority(title: string, description: string, category: string): PriorityResult {
  const text = `${title} ${description}`.toLowerCase()
  
  // Check for high priority keywords
  const highPriorityMatches = HIGH_PRIORITY_KEYWORDS.filter(keyword => 
    text.includes(keyword)
  ).length

  // Check for medium priority keywords
  const mediumPriorityMatches = MEDIUM_PRIORITY_KEYWORDS.filter(keyword => 
    text.includes(keyword)
  ).length

  // Check for low priority keywords
  const lowPriorityMatches = LOW_PRIORITY_KEYWORDS.filter(keyword => 
    text.includes(keyword)
  ).length

  // Category-based priority adjustments
  const categoryPriority: Record<string, number> = {
    electricity: 4, // High priority - affects many people
    water: 4,      // High priority - essential service
    it: 3,         // Medium priority - affects work
    hostel: 3,     // Medium priority - affects residents
    garbage: 2,    // Lower priority - less urgent
  }

  let priority = 1 // Default priority
  let reason = "Standard priority"

  // High priority detection
  if (highPriorityMatches > 0 || categoryPriority[category] === 4) {
    priority = Math.min(4 + Math.min(highPriorityMatches, 1), 5)
    reason = highPriorityMatches > 0 
      ? `High priority keywords detected (${highPriorityMatches} matches)`
      : `High priority category: ${category}`
  }
  // Medium priority detection
  else if (mediumPriorityMatches > 0 || categoryPriority[category] === 3) {
    priority = 3
    reason = mediumPriorityMatches > 0
      ? `Medium priority keywords detected (${mediumPriorityMatches} matches)`
      : `Medium priority category: ${category}`
  }
  // Low priority detection
  else if (lowPriorityMatches > 0 || categoryPriority[category] === 2) {
    priority = 2
    reason = lowPriorityMatches > 0
      ? `Low priority keywords detected (${lowPriorityMatches} matches)`
      : `Low priority category: ${category}`
  }
  // Default priority
  else {
    priority = categoryPriority[category] || 1
    reason = `Standard priority for category: ${category}`
  }

  return { priority, reason }
}

/**
 * Get priority label
 */
export function getPriorityLabel(priority: number): string {
  const labels: Record<number, string> = {
    1: "Low",
    2: "Low-Medium",
    3: "Medium",
    4: "High",
    5: "Critical"
  }
  return labels[priority] || "Unknown"
}


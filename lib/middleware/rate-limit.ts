/**
 * Rate Limiting Middleware
 * Prevents spam and abuse
 */

import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 requests per hour
}

const INCIDENT_CREATION_CONFIG: RateLimitConfig = {
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 5, // 5 incidents per day per user
}

/**
 * Check rate limit for a user
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const db = await getDb()
  const rateLimitCollection = db.collection("rate_limits")

  const now = new Date()
  const windowStart = new Date(now.getTime() - config.windowMs)

  // Get or create rate limit record
  const rateLimit = await rateLimitCollection.findOne({
    user_id: userId,
    window_start: { $gte: windowStart },
  })

  if (!rateLimit) {
    // Create new rate limit record
    await rateLimitCollection.insertOne({
      user_id: userId,
      count: 1,
      window_start: now,
      window_end: new Date(now.getTime() + config.windowMs),
    })

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now.getTime() + config.windowMs),
    }
  }

  // Check if limit exceeded
  if (rateLimit.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: rateLimit.window_end,
    }
  }

  // Increment count
  await rateLimitCollection.updateOne(
    { _id: rateLimit._id },
    { $inc: { count: 1 } }
  )

  return {
    allowed: true,
    remaining: config.maxRequests - (rateLimit.count + 1),
    resetAt: rateLimit.window_end,
  }
}

/**
 * Check rate limit for incident creation (stricter)
 */
export async function checkIncidentCreationRateLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  return checkRateLimit(userId, INCIDENT_CREATION_CONFIG)
}

/**
 * Clean up old rate limit records
 */
export async function cleanupRateLimits(): Promise<void> {
  const db = await getDb()
  const rateLimitCollection = db.collection("rate_limits")

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  await rateLimitCollection.deleteMany({
    window_end: { $lt: oneDayAgo },
  })
}


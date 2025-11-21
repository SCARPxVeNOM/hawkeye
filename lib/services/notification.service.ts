/**
 * Notification Service
 * Handles all notification-related operations
 */

import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export type NotificationType =
  | "new_complaint"
  | "technician_assigned"
  | "prediction_alert"
  | "issue_resolved"
  | "sla_exceeded"
  | "escalation"

export interface Notification {
  id?: string
  user_id: string
  type: NotificationType
  message: string
  read: boolean
  created_at: Date | string
  metadata?: Record<string, any>
}

export interface CreateNotificationData {
  user_id: string
  type: NotificationType
  message: string
  metadata?: Record<string, any>
}

/**
 * Format notification from MongoDB document
 */
function formatNotification(notification: any): Notification {
  return {
    id: notification._id.toString(),
    user_id: notification.user_id,
    type: notification.type,
    message: notification.message,
    read: notification.read || false,
    created_at: notification.created_at instanceof Date
      ? notification.created_at.toISOString()
      : notification.created_at,
    metadata: notification.metadata || {},
  }
}

/**
 * Create a new notification
 */
export async function createNotification(
  data: CreateNotificationData
): Promise<Notification> {
  const db = await getDb()
  const notificationsCollection = db.collection("notifications")

  const notification = {
    user_id: data.user_id,
    type: data.type,
    message: data.message,
    read: false,
    metadata: data.metadata || {},
    created_at: new Date(),
  }

  const result = await notificationsCollection.insertOne(notification)

  return {
    id: result.insertedId.toString(),
    ...formatNotification(notification),
  }
}

/**
 * Create multiple notifications (bulk)
 */
export async function createNotifications(
  notifications: CreateNotificationData[]
): Promise<Notification[]> {
  const db = await getDb()
  const notificationsCollection = db.collection("notifications")

  const now = new Date()
  const notificationsToInsert = notifications.map((data) => ({
    user_id: data.user_id,
    type: data.type,
    message: data.message,
    read: false,
    metadata: data.metadata || {},
    created_at: now,
  }))

  const result = await notificationsCollection.insertMany(notificationsToInsert)

  return notificationsToInsert.map((notif, index) => ({
    id: result.insertedIds[index].toString(),
    ...formatNotification(notif),
  }))
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
): Promise<Notification[]> {
  const db = await getDb()
  const notificationsCollection = db.collection("notifications")

  const query: any = { user_id: userId }
  if (options.unreadOnly) {
    query.read = false
  }

  const limit = options.limit || 50

  const notifications = await notificationsCollection
    .find(query)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray()

  return notifications.map(formatNotification)
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!ObjectId.isValid(notificationId)) {
    throw new Error("Invalid notification ID format")
  }

  const db = await getDb()
  const notificationsCollection = db.collection("notifications")

  await notificationsCollection.updateOne(
    { _id: new ObjectId(notificationId) },
    { $set: { read: true } }
  )
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const db = await getDb()
  const notificationsCollection = db.collection("notifications")

  await notificationsCollection.updateMany(
    { user_id: userId, read: false },
    { $set: { read: true } }
  )
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const db = await getDb()
  const notificationsCollection = db.collection("notifications")

  return await notificationsCollection.countDocuments({
    user_id: userId,
    read: false,
  })
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  if (!ObjectId.isValid(notificationId)) {
    throw new Error("Invalid notification ID format")
  }

  const db = await getDb()
  const notificationsCollection = db.collection("notifications")

  await notificationsCollection.deleteOne({
    _id: new ObjectId(notificationId),
  })
}

/**
 * Notification helper functions for common scenarios
 */

/**
 * Notify user about new complaint
 */
export async function notifyNewComplaint(
  userId: string,
  incidentId: string,
  title: string
): Promise<Notification> {
  return createNotification({
    user_id: userId,
    type: "new_complaint",
    message: `Your complaint "${title}" has been submitted successfully.`,
    metadata: { incident_id: incidentId },
  })
}

/**
 * Notify technician about assignment
 */
export async function notifyTechnicianAssignment(
  technicianId: string,
  incidentId: string,
  title: string,
  location: string
): Promise<Notification> {
  return createNotification({
    user_id: technicianId,
    type: "technician_assigned",
    message: `You have been assigned to incident: "${title}" at ${location}`,
    metadata: { incident_id: incidentId },
  })
}

/**
 * Notify user about resolution
 */
export async function notifyIssueResolved(
  userId: string,
  incidentId: string,
  title: string
): Promise<Notification> {
  return createNotification({
    user_id: userId,
    type: "issue_resolved",
    message: `Your complaint "${title}" has been resolved.`,
    metadata: { incident_id: incidentId },
  })
}

/**
 * Notify about SLA exceeded
 */
export async function notifySLAExceeded(
  userId: string,
  incidentId: string,
  title: string
): Promise<Notification> {
  return createNotification({
    user_id: userId,
    type: "sla_exceeded",
    message: `Alert: SLA exceeded for incident "${title}". Escalating...`,
    metadata: { incident_id: incidentId },
  })
}

/**
 * Notify about prediction alert
 */
export async function notifyPredictionAlert(
  userId: string,
  location: string,
  category: string,
  message: string
): Promise<Notification> {
  return createNotification({
    user_id: userId,
    type: "prediction_alert",
    message: `Prediction Alert: ${message}`,
    metadata: { location, category },
  })
}


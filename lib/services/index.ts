/**
 * Service Layer Index
 * Central export point for all services
 */

// Incident Service
export {
  getIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  deleteIncident,
  getIncidentStats,
  checkDuplicateIncident,
  type Incident,
  type IncidentFilters,
  type CreateIncidentData,
  type UpdateIncidentData,
} from "./incident.service"

// Priority Service
export {
  detectPriority,
  getPriorityLabel,
  type PriorityResult,
} from "./priority.service"

// Prediction Service
export {
  generateFrequencyBasedPredictions,
  generateRuleBasedPredictions,
  generateAndSavePredictions,
  getPredictions,
  savePrediction,
  type Prediction,
  type PredictionResult,
} from "./prediction.service"

// Notification Service
export {
  createNotification,
  createNotifications,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  deleteNotification,
  notifyNewComplaint,
  notifyTechnicianAssignment,
  notifyIssueResolved,
  notifySLAExceeded,
  notifyPredictionAlert,
  type Notification,
  type NotificationType,
  type CreateNotificationData,
} from "./notification.service"

// Technician Service
export {
  getTechnicians,
  getTechnicianById,
  createSchedule,
  getTechnicianSchedules,
  updateScheduleStatus,
  findAvailableTechnicians,
  autoAssignTechnician,
  hasOverlappingSchedule,
  type Technician,
  type TechnicianSchedule,
  type CreateScheduleData,
} from "./technician.service"


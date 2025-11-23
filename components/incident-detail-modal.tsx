"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, MapPin, Calendar, User, AlertCircle, Image as ImageIcon } from "lucide-react"
import IncidentUpdates from "@/components/incident-updates"
import TechnicianFeedbackForm from "@/components/technician-feedback-form"

interface Incident {
  id: string
  title: string
  category: string
  description: string
  location: string
  latitude?: number | null
  longitude?: number | null
  status: string
  priority: number
  image_url?: string | null
  created_at: string
  updated_at: string
  resolved_at?: string | null
  user_id?: string
  assigned_to?: string | null
}

interface IncidentDetailModalProps {
  incidentId: string | null
  isOpen: boolean
  onClose: () => void
}

export default function IncidentDetailModal({ incidentId, isOpen, onClose }: IncidentDetailModalProps) {
  const { data: session } = useSession()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Get user ID - prioritize session (OAuth) over localStorage (email/password)
    if (session?.user?.id) {
      setUserId(session.user.id)
    } else if (typeof window !== "undefined") {
      const userData = JSON.parse(localStorage.getItem("user") || "{}")
      if (userData.id) {
        setUserId(userData.id)
      }
    }

    if (isOpen && incidentId) {
      fetchIncidentDetails()
    } else if (!isOpen) {
      // Clear data when modal closes
      setIncident(null)
      setError("")
    }
  }, [isOpen, incidentId, session])

  const fetchIncidentDetails = async () => {
    if (!incidentId) return

    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/incidents/${incidentId}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to fetch incident details")
      }
      const data = await response.json()
      setIncident(data)
    } catch (err: any) {
      console.error("Error fetching incident details:", err)
      setError(err.message || "Failed to load incident details")
    } finally {
      setLoading(false)
    }
  }

  const getCategoryStyle = (category: string) => {
    const styles: Record<string, string> = {
      water: "bg-blue-100 text-blue-700 border-blue-200",
      electricity: "bg-amber-100 text-amber-700 border-amber-200",
      garbage: "bg-emerald-100 text-emerald-700 border-emerald-200",
      it: "bg-indigo-100 text-indigo-700 border-indigo-200",
      hostel: "bg-rose-100 text-rose-700 border-rose-200",
    }
    return styles[category] || "bg-slate-100 text-slate-700 border-slate-200"
  }

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      new: "bg-blue-500 text-white",
      "in-progress": "bg-amber-500 text-white",
      resolved: "bg-teal-500 text-white",
      closed: "bg-slate-500 text-white",
    }
    return styles[status] || "bg-slate-500 text-white"
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardHeader className="border-b sticky top-0 bg-card z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Incident Details</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading incident details...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive">{error}</p>
            </div>
          ) : incident ? (
            <>
              {/* Title and Status */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-2">{incident.title}</h2>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{incident.location}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <span
                    className={`px-3 py-1 text-xs rounded-full font-semibold border ${getCategoryStyle(incident.category)}`}
                  >
                    {incident.category.toUpperCase()}
                  </span>
                  <span
                    className={`px-3 py-1 text-xs rounded-full font-semibold ${getStatusStyle(incident.status)}`}
                  >
                    {incident.status.replace("-", " ").toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Image */}
              {incident.image_url && (
                <div className="rounded-lg overflow-hidden border">
                  <img
                    src={incident.image_url}
                    alt={incident.title}
                    className="w-full h-auto max-h-96 object-cover"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{incident.description}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {new Date(incident.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>

                {incident.updated_at && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Last Updated</p>
                      <p className="font-medium">
                        {new Date(incident.updated_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {incident.resolved_at && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Resolved</p>
                      <p className="font-medium">
                        {new Date(incident.resolved_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Priority</p>
                    <p className="font-medium">Level {incident.priority}</p>
                  </div>
                </div>

                {incident.latitude && incident.longitude && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Coordinates</p>
                      <p className="font-medium text-xs">
                        {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Incident Updates */}
              <div className="pt-6 border-t">
                <IncidentUpdates incidentId={incident.id!} />
              </div>

              {/* Feedback Form - Show only if resolved and user is the owner */}
              {incident.status === "resolved" && 
               userId && 
               incident.user_id === userId && (
                <div className="pt-6 border-t">
                  <TechnicianFeedbackForm
                    incidentId={incident.id!}
                    technicianId={incident.assigned_to || null}
                    userId={userId}
                    onSuccess={() => {
                      // Refresh incident details to show updated feedback
                      fetchIncidentDetails()
                    }}
                  />
                </div>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}


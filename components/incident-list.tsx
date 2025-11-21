"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { MapPin, Calendar, ArrowRight, FileText } from "lucide-react"
import IncidentDetailModal from "@/components/incident-detail-modal"
import IncidentUpdates from "@/components/incident-updates"

interface Incident {
  id: string
  title: string
  category: string
  location: string
  status: string
  priority: number
  created_at: string
  image_url?: string
}

interface IncidentListProps {
  userOnly?: boolean
  showUpdates?: boolean
}

export default function IncidentList({ userOnly = false, showUpdates = false }: IncidentListProps) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchIncidents()
  }, [userOnly])

  const fetchIncidents = async () => {
    try {
      setLoading(true)
      // Get user ID if userOnly is true
      const userData = JSON.parse(localStorage.getItem("user") || "{}")
      const userId = userData.id

      let url = "/api/incidents"
      if (userOnly && userId) {
        url += `?userId=${userId}`
      }

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setIncidents(data)
      } else {
        console.error("Failed to fetch incidents")
        // Fallback to localStorage for backward compatibility
        const stored = JSON.parse(localStorage.getItem("incidents") || "[]")
        setIncidents(stored)
      }
    } catch (error) {
      console.error("Error fetching incidents:", error)
      // Fallback to localStorage
      const stored = JSON.parse(localStorage.getItem("incidents") || "[]")
      setIncidents(stored)
    } finally {
      setLoading(false)
    }
  }

  const filteredIncidents = incidents.filter((incident) => {
    if (filter === "all") return true
    return incident.status === filter
  })

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
      new: "bg-blue-500 text-white shadow-blue-200",
      "in-progress": "bg-amber-500 text-white shadow-amber-200",
      resolved: "bg-teal-500 text-white shadow-teal-200",
      closed: "bg-slate-500 text-white",
    }
    return styles[status] || "bg-slate-500 text-white"
  }

  return (
    <Card className="p-8 shadow-lg border-none bg-card">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{userOnly ? "My Reported Issues" : "All Incidents"}</h2>
          <p className="text-muted-foreground mt-1">Track and manage your complaints</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {["all", "new", "in-progress", "resolved", "closed"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-sm rounded-full font-medium transition-all duration-200 whitespace-nowrap ${
                filter === status
                  ? "bg-primary text-primary-foreground shadow-md transform scale-105"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">Loading incidents...</h3>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed border-border">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No incidents found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your filters or report a new issue.</p>
          </div>
        ) : (
          filteredIncidents.map((incident) => (
            <div
              key={incident.id}
              className="group flex flex-col md:flex-row items-start gap-6 p-6 bg-card border border-border/50 rounded-xl hover:shadow-lg hover:border-secondary/30 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity"></div>

              {incident.image_url && (
                <div className="w-full md:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                  <img
                    src={incident.image_url || "/placeholder.svg"}
                    alt={incident.title}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              )}

              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {incident.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-4 h-4 text-secondary" />
                      {incident.location}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-semibold border ${getCategoryStyle(incident.category)}`}
                    >
                      {incident.category.toUpperCase()}
                    </span>
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-semibold shadow-sm ${getStatusStyle(incident.status)}`}
                    >
                      {incident.status.replace("-", " ").toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {new Date(incident.created_at).toLocaleDateString(undefined, {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                    {new Date(incident.created_at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedIncidentId(incident.id)
                      setIsModalOpen(true)
                    }}
                    className="text-sm font-medium text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0"
                  >
                    View Details <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <IncidentDetailModal
        incidentId={selectedIncidentId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedIncidentId(null)
        }}
      />

      {showUpdates && selectedIncidentId && (
        <div className="mt-6">
          <IncidentUpdates incidentId={selectedIncidentId} />
        </div>
      )}
    </Card>
  )
}

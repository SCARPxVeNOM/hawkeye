"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"

interface Assignment {
  id: string
  incident_id: string
  technician_id: string
  technician_name: string
  incident_title: string
  location: string
  scheduled_time: string
  duration_minutes: number
  status: "scheduled" | "in-progress" | "completed"
  sla_deadline?: string | null
}

interface Technician {
  id: string
  name: string
  specialization: string
  active: boolean
  available: boolean
  current_assignments: number
  max_concurrent: number
}

interface Incident {
  id: string
  title: string
  category: string
  location: string
  status: string
  assigned_to?: string
}

export default function TechnicianScheduler() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selectedTechnicians, setSelectedTechnicians] = useState<Record<string, string>>({})
  const [technicians, setTechnicians] = useState<Technician[]>([])

  useEffect(() => {
    fetchAssignments()
    fetchIncidents()
    fetchTechnicians()
    
    // Auto-refresh assignments every 10 seconds
    const interval = setInterval(() => {
      fetchAssignments()
      fetchIncidents()
      fetchTechnicians()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [])
  
  const fetchAssignments = async () => {
    try {
      const response = await fetch("/api/technicians/assignments")
      if (response.ok) {
        const data = await response.json()
        setAssignments(data)
        // Also update localStorage as backup
        localStorage.setItem("technician_assignments", JSON.stringify(data))
      } else {
        // Fallback to localStorage
        const stored = JSON.parse(localStorage.getItem("technician_assignments") || "[]")
        setAssignments(stored)
      }
    } catch (error) {
      console.error("Error fetching assignments:", error)
      // Fallback to localStorage
      const stored = JSON.parse(localStorage.getItem("technician_assignments") || "[]")
      setAssignments(stored)
    }
  }

  const fetchTechnicians = async () => {
    try {
      const response = await fetch("/api/technicians")
      if (response.ok) {
        const data = await response.json()
        setTechnicians(data)
      } else {
        console.error("Failed to fetch technicians")
      }
    } catch (error) {
      console.error("Error fetching technicians:", error)
    }
  }

  const fetchIncidents = async () => {
    try {
      const response = await fetch("/api/incidents")
      if (response.ok) {
        const data = await response.json()
        // If API returns empty array, try localStorage as fallback
        if (Array.isArray(data) && data.length === 0) {
          const stored = JSON.parse(localStorage.getItem("incidents") || "[]")
          if (stored.length > 0) {
            setIncidents(stored)
            return
          }
        }
        setIncidents(data)
      } else {
        // Fallback to localStorage
        const stored = JSON.parse(localStorage.getItem("incidents") || "[]")
        setIncidents(stored)
      }
    } catch (error) {
      console.error("Error fetching incidents:", error)
      // Fallback to localStorage
      const stored = JSON.parse(localStorage.getItem("incidents") || "[]")
      setIncidents(stored)
    }
  }

  const assignTechnician = async (incidentId: string, incidentTitle: string, location: string, technicianId: string) => {
    const technician = technicians.find((t) => t.id === technicianId)
    if (!technician) return

    if (technician.current_assignments >= technician.max_concurrent) {
      alert("Technician has reached max concurrent assignments")
      return
    }

    const newAssignment: Assignment = {
      id: Math.random().toString(36).substr(2, 9),
      incident_id: incidentId,
      technician_id: technicianId,
      technician_name: technician.name,
      incident_title: incidentTitle,
      location,
      scheduled_time: new Date(Date.now() + 15 * 60000).toISOString(), // 15 mins from now (SLA)
      duration_minutes: 30,
      status: "scheduled",
    }

    const updated = [...assignments, newAssignment]
    setAssignments(updated)
    localStorage.setItem("technician_assignments", JSON.stringify(updated))

    // Update technician assignments count
    setTechnicians(
      technicians.map((t) => (t.id === technicianId ? { ...t, current_assignments: t.current_assignments + 1 } : t)),
    )

    // Update incident to mark as assigned
    try {
      await fetch(`/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assigned_to: technicianId,
          status: "in-progress"
        }),
      })
      // Refresh incidents list
      await fetchIncidents()
      // Reset select dropdown
      setSelectedTechnicians((prev) => {
        const updated = { ...prev }
        delete updated[incidentId]
        return updated
      })
    } catch (error) {
      console.error("Error updating incident:", error)
      // Fallback: update local incidents state
      const updatedIncidents = incidents.map((inc) =>
        inc.id === incidentId
          ? { ...inc, assigned_to: technicianId, status: "in-progress" }
          : inc
      )
      setIncidents(updatedIncidents)
      localStorage.setItem("incidents", JSON.stringify(updatedIncidents))
      // Reset select dropdown
      setSelectedTechnicians((prev) => {
        const updated = { ...prev }
        delete updated[incidentId]
        return updated
      })
    }
  }

  const updateAssignmentStatus = async (assignmentId: string, newStatus: "scheduled" | "in-progress" | "completed") => {
    const assignment = assignments.find((a) => a.id === assignmentId)
    if (!assignment) return

    const updated = assignments.map((a) => (a.id === assignmentId ? { ...a, status: newStatus } : a))
    setAssignments(updated)
    localStorage.setItem("technician_assignments", JSON.stringify(updated))

    // If completed, update incident status and technician assignment count
    if (newStatus === "completed") {
      // Update incident status to resolved
      try {
        await fetch(`/api/incidents/${assignment.incident_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "resolved" }),
        })
        // Refresh incidents list
        fetchIncidents()
      } catch (error) {
        console.error("Error updating incident status:", error)
        // Fallback: update local incidents state
        const updatedIncidents = incidents.map((inc) =>
          inc.id === assignment.incident_id
            ? { ...inc, status: "resolved" }
            : inc
        )
        setIncidents(updatedIncidents)
        localStorage.setItem("incidents", JSON.stringify(updatedIncidents))
      }

      // Update technician assignment count
      setTechnicians(
        technicians.map((t) =>
          t.id === assignment.technician_id
            ? { ...t, current_assignments: Math.max(0, t.current_assignments - 1) }
            : t
        )
      )
    } else if (newStatus === "in-progress") {
      // Update incident status to in-progress
      try {
        await fetch(`/api/incidents/${assignment.incident_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "in-progress" }),
        })
        fetchIncidents()
      } catch (error) {
        console.error("Error updating incident status:", error)
        const updatedIncidents = incidents.map((inc) =>
          inc.id === assignment.incident_id
            ? { ...inc, status: "in-progress" }
            : inc
        )
        setIncidents(updatedIncidents)
        localStorage.setItem("incidents", JSON.stringify(updatedIncidents))
      }
    }
  }

  const reassignTechnician = (assignmentId: string, newTechId: string) => {
    const assignment = assignments.find((a) => a.id === assignmentId)
    if (!assignment) return

    const updated = assignments.map((a) =>
      a.id === assignmentId
        ? {
            ...a,
            technician_id: newTechId,
            technician_name: technicians.find((t) => t.id === newTechId)?.name || a.technician_name,
          }
        : a,
    )
    setAssignments(updated)
    localStorage.setItem("technician_assignments", JSON.stringify(updated))
  }

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">Technician Scheduling</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Technician Availability */}
          <div className="lg:col-span-1">
            <h3 className="font-medium text-foreground mb-3">Available Technicians</h3>
            <div className="space-y-2">
              {technicians.map((tech) => (
                <div
                  key={tech.id}
                  className="p-3 border border-border rounded-md bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm text-foreground">{tech.name}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        tech.available && tech.current_assignments < tech.max_concurrent
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : "bg-red-500/10 text-red-500 border-red-500/20"
                      }`}
                    >
                      {tech.current_assignments}/{tech.max_concurrent}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{tech.specialization}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Active Assignments */}
          <div className="lg:col-span-2">
            <h3 className="font-medium text-foreground mb-3">Active Assignments</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {assignments.filter((a) => a.status !== "completed").length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-md text-muted-foreground text-sm">
                  No active assignments
                </div>
              ) : (
                assignments
                  .filter((a) => a.status !== "completed")
                  .map((assignment) => (
                    <div key={assignment.id} className="p-3 border border-border rounded-md bg-card">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-foreground">{assignment.incident_title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{assignment.location}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">Tech: {assignment.technician_name}</span>
                          </div>
                        </div>
                        <select
                          value={assignment.status}
                          onChange={(e) => updateAssignmentStatus(assignment.id, e.target.value as any)}
                          className="text-xs px-2 py-1 border border-input rounded bg-background text-foreground focus:ring-1 focus:ring-ring outline-none"
                        >
                          <option value="scheduled">Scheduled</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          Scheduled: {new Date(assignment.scheduled_time).toLocaleTimeString()}
                        </span>
                        {assignment.sla_deadline && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-red-500">
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>
                              SLA: {new Date(assignment.sla_deadline).toLocaleTimeString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Scheduling Interface */}
        <div className="border-t border-border pt-6">
          <h3 className="font-medium text-foreground mb-4">Assign Incidents</h3>
          <div className="space-y-3">
            {incidents.filter((inc) => !inc.assigned_to && (inc.status === "new" || inc.status === "pending")).length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-md text-muted-foreground text-sm">
                No unassigned incidents
              </div>
            ) : (
              incidents
                .filter((inc) => !inc.assigned_to && (inc.status === "new" || inc.status === "pending"))
                .map((incident) => (
                  <div key={incident.id} className="p-4 border border-border rounded-md bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{incident.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{incident.location} • {incident.category}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full">
                        {incident.status}
                      </span>
                    </div>
                    <select
                      value={selectedTechnicians[incident.id] || ""}
                      onChange={(e) => {
                        setSelectedTechnicians((prev) => ({ ...prev, [incident.id]: e.target.value }))
                        if (e.target.value) {
                          assignTechnician(incident.id, incident.title, incident.location, e.target.value)
                        }
                      }}
                      className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:ring-1 focus:ring-ring outline-none"
                    >
                      <option value="">Select technician...</option>
                      {technicians
                        .filter((t) => t.current_assignments < t.max_concurrent)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.specialization})
                          </option>
                        ))}
                    </select>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"

interface SLAStatus {
  incident_id: string
  title: string
  time_since_creation: number // in minutes
  sla_minutes: number
  status: "ok" | "warning" | "critical"
  percentage_used: number
}

export default function SLAMonitor() {
  const [slaStatuses, setSLAStatuses] = useState<SLAStatus[]>([])

  useEffect(() => {
    fetchIncidents()
    // Auto-refresh every 30 seconds to update SLA status
    const interval = setInterval(() => {
      fetchIncidents()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchIncidents = async () => {
    try {
      const response = await fetch("/api/incidents")
      if (response.ok) {
        const incidents = await response.json()
        calculateSLA(incidents)
      } else {
        // Fallback to localStorage
        const incidents = JSON.parse(localStorage.getItem("incidents") || "[]")
        calculateSLA(incidents)
      }
    } catch (error) {
      console.error("Error fetching incidents:", error)
      // Fallback to localStorage
      const incidents = JSON.parse(localStorage.getItem("incidents") || "[]")
      calculateSLA(incidents)
    }
  }

  const calculateSLA = (incidents: any[]) => {
    const slaMinutes = 15

    const statuses = incidents
      .filter((inc: any) => inc.status === "new" || inc.status === "in-progress")
      .map((inc: any) => {
        const createdTime = new Date(inc.created_at)
        const now = new Date()
        const timeSinceCreation = Math.floor((now.getTime() - createdTime.getTime()) / 60000)
        const percentage = (timeSinceCreation / slaMinutes) * 100

        let status: "ok" | "warning" | "critical" = "ok"
        if (percentage >= 100) status = "critical"
        else if (percentage >= 80) status = "warning"

        return {
          incident_id: inc.id,
          title: inc.title,
          time_since_creation: timeSinceCreation,
          sla_minutes: slaMinutes,
          status,
          percentage_used: Math.min(percentage, 100),
        }
      })

    setSLAStatuses(statuses)
  }

  const getStatusColor = (status: "ok" | "warning" | "critical") => {
    switch (status) {
      case "ok":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "warning":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "critical":
        return "bg-red-500/10 text-red-500 border-red-500/20"
    }
  }

  const triggerEscalationCheck = async () => {
    try {
      const response = await fetch("/api/escalation/check", {
        method: "POST",
      })
      if (response.ok) {
        const data = await response.json()
        alert(`SLA Check Complete: ${data.message}`)
        fetchIncidents() // Refresh after escalation check
      } else {
        alert("Failed to check SLA escalations")
      }
    } catch (error) {
      console.error("Error triggering escalation check:", error)
      alert("Error checking SLA escalations")
    }
  }

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">SLA Monitoring</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground border border-border px-2 py-1 rounded-md">
              Target: 15 min
            </span>
            <button
              onClick={triggerEscalationCheck}
              className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Check Escalations
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {slaStatuses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-md">
              All incidents within SLA limits
            </div>
          ) : (
            slaStatuses.map((sla) => (
              <div
                key={sla.incident_id}
                className="p-4 border border-border rounded-md bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium text-foreground text-sm">{sla.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(sla.status)}`}>
                    {sla.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Time Elapsed</span>
                  <span>
                    {sla.time_since_creation} / {sla.sla_minutes} min
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      sla.status === "critical"
                        ? "bg-red-500"
                        : sla.status === "warning"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${sla.percentage_used}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  )
}

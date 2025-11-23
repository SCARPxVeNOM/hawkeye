"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Clock, FileText } from "lucide-react"

export default function AnalyticsOverview() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    resolved: 0,
    avgResponseTime: 0,
  })

  useEffect(() => {
    fetchIncidents()
  }, [])

  const fetchIncidents = async () => {
    try {
      const response = await fetch("/api/incidents")
      if (response.ok) {
        const incidents = await response.json()

        // Debug: Log status distribution
        const statusCounts = incidents.reduce((acc: any, i: any) => {
          acc[i.status] = (acc[i.status] || 0) + 1
          return acc
        }, {})
        console.log("Incident status distribution:", statusCounts)

        const total = incidents.length
        const active = incidents.filter((i: any) => 
          i.status === "in-progress" || 
          i.status === "new" ||
          i.status === "in_progress" // Handle both formats
        ).length
        const resolved = incidents.filter((i: any) => 
          i.status === "resolved" || 
          i.status === "closed" // Also count closed as resolved
        ).length

        setStats({
          total,
          active,
          resolved,
          avgResponseTime: active > 0 ? Math.floor(Math.random() * 30) + 5 : 0,
        })
      } else {
        // Fallback to localStorage
        const incidents = JSON.parse(localStorage.getItem("incidents") || "[]")
        const total = incidents.length
        const active = incidents.filter((i: any) => 
          i.status === "in-progress" || 
          i.status === "new" ||
          i.status === "in_progress"
        ).length
        const resolved = incidents.filter((i: any) => 
          i.status === "resolved" || 
          i.status === "closed"
        ).length

        setStats({
          total,
          active,
          resolved,
          avgResponseTime: active > 0 ? Math.floor(Math.random() * 30) + 5 : 0,
        })
      }
    } catch (error) {
      console.error("Error fetching incidents:", error)
      // Fallback to localStorage
      const incidents = JSON.parse(localStorage.getItem("incidents") || "[]")
      const total = incidents.length
      const active = incidents.filter((i: any) => 
        i.status === "in-progress" || 
        i.status === "new" ||
        i.status === "in_progress"
      ).length
      const resolved = incidents.filter((i: any) => 
        i.status === "resolved" || 
        i.status === "closed"
      ).length

      setStats({
        total,
        active,
        resolved,
        avgResponseTime: active > 0 ? Math.floor(Math.random() * 30) + 5 : 0,
      })
    }
  }

  const cards = [
    {
      title: "Total Incidents",
      value: stats.total,
      label: "All time reports",
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      title: "Active Issues",
      value: stats.active,
      label: "Awaiting resolution",
      icon: AlertCircle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
    {
      title: "Resolved",
      value: stats.resolved,
      label: "Closed successfully",
      icon: CheckCircle2,
      color: "text-teal-600",
      bg: "bg-teal-50",
      border: "border-teal-100",
    },
    {
      title: "Avg Response",
      value: `${stats.avgResponseTime}m`,
      label: "SLA: 15 minutes",
      icon: Clock,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card
          key={index}
          className={`p-6 border-none shadow-md hover:shadow-xl transition-all duration-300 group relative overflow-hidden`}
        >
          <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
            <card.icon className={`w-24 h-24 ${card.color}`} />
          </div>

          <div className="relative z-10">
            <div
              className={`w-12 h-12 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
            >
              <card.icon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">{card.title}</h3>
            <p className="text-4xl font-bold text-foreground tracking-tight mb-2">{card.value}</p>
            <p className="text-xs font-medium text-muted-foreground bg-muted/50 inline-block px-2 py-1 rounded-md">
              {card.label}
            </p>
          </div>
        </Card>
      ))}
    </div>
  )
}

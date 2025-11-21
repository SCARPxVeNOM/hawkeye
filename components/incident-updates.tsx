"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, User, MessageSquare } from "lucide-react"

interface IncidentUpdate {
  id: string
  incident_id: string
  user_id: string
  status: string
  comment?: string
  created_at: string
}

interface IncidentUpdatesProps {
  incidentId: string
}

export default function IncidentUpdates({ incidentId }: IncidentUpdatesProps) {
  const [updates, setUpdates] = useState<IncidentUpdate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (incidentId) {
      fetchUpdates()
    }
  }, [incidentId])

  const fetchUpdates = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/incidents/${incidentId}/updates`)
      if (response.ok) {
        const data = await response.json()
        setUpdates(data)
      }
    } catch (error) {
      console.error("Error fetching incident updates:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-500"
      case "in-progress":
        return "bg-amber-500"
      case "resolved":
        return "bg-green-500"
      case "closed":
        return "bg-slate-500"
      default:
        return "bg-gray-500"
    }
  }

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading updates...</div>
  }

  if (updates.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">No updates available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {updates.map((update, index) => (
            <div
              key={update.id}
              className="flex gap-4 pb-4 border-b border-border last:border-0"
            >
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(update.status)}`} />
                {index < updates.length - 1 && (
                  <div className="w-0.5 h-full bg-border mt-2" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full text-white ${getStatusColor(update.status)}`}
                  >
                    {update.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(update.created_at).toLocaleString()}
                  </span>
                </div>
                {update.comment && (
                  <div className="flex items-start gap-2 mt-2 p-2 bg-muted rounded-md">
                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-foreground">{update.comment}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


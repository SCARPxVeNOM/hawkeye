"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle2, Clock, AlertTriangle, TrendingUp } from "lucide-react"

interface TechnicianPerformance {
  technician_id: string
  technician_name: string
  total_assignments: number
  completed_assignments: number
  in_progress_assignments: number
  average_response_time: number
  average_resolution_time: number
  sla_compliance_rate: number
  on_time_completions: number
  overdue_completions: number
  category_breakdown: Record<string, number>
}

export default function TechnicianPerformanceComponent() {
  const [performances, setPerformances] = useState<TechnicianPerformance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPerformance()
  }, [])

  const fetchPerformance = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/technicians/performance")
      if (response.ok) {
        const data = await response.json()
        setPerformances(data)
      }
    } catch (error) {
      console.error("Error fetching technician performance:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">Loading performance data...</div>
        </CardContent>
      </Card>
    )
  }

  if (performances.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">No technician performance data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {performances.map((perf) => (
        <Card key={perf.technician_id}>
          <CardHeader>
            <CardTitle>{perf.technician_name}</CardTitle>
            <CardDescription>Performance metrics and statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Total Assignments</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{perf.total_assignments}</p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">Completed</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{perf.completed_assignments}</p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Avg Response</p>
                </div>
                <p className="text-2xl font-bold text-amber-600">{perf.average_response_time}m</p>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100">SLA Compliance</p>
                </div>
                <p className="text-2xl font-bold text-purple-600">{perf.sla_compliance_rate}%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Response & Resolution Times</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average Response Time:</span>
                    <span className="font-medium">{perf.average_response_time} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average Resolution Time:</span>
                    <span className="font-medium">{perf.average_resolution_time} minutes</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">SLA Performance</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">On-Time Completions:</span>
                    <span className="font-medium text-green-600">{perf.on_time_completions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overdue Completions:</span>
                    <span className="font-medium text-red-600">{perf.overdue_completions}</span>
                  </div>
                </div>
              </div>
            </div>

            {Object.keys(perf.category_breakdown).length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-sm font-semibold mb-2">Category Breakdown</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(perf.category_breakdown).map(([category, count]) => (
                    <span
                      key={category}
                      className="px-3 py-1 bg-muted rounded-full text-xs font-medium"
                    >
                      {category}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}


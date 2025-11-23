"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, Star } from "lucide-react"

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
  feedback_stats?: {
    total_feedback: number
    average_rating: number
    rating_distribution: { 1: number; 2: number; 3: number; 4: number; 5: number }
  }
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
        console.log("Technician Performance Data:", data)
        // Log feedback stats for debugging
        data.forEach((perf: any) => {
          console.log(`${perf.technician_name} - Feedback Stats:`, perf.feedback_stats)
        })
        setPerformances(data)
      } else {
        console.error("Failed to fetch performance data:", response.status, response.statusText)
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

            {/* Feedback Statistics - Always show section */}
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Student Feedback
              </h4>
              {perf.feedback_stats && perf.feedback_stats.total_feedback > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Rating</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= Math.round(perf.feedback_stats!.average_rating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-semibold text-foreground">
                        {perf.feedback_stats.average_rating.toFixed(1)}/5.0
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Feedback</span>
                    <span className="font-medium">{perf.feedback_stats.total_feedback} reviews</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Rating Distribution</p>
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = perf.feedback_stats!.rating_distribution[rating as keyof typeof perf.feedback_stats.rating_distribution]
                      const percentage = perf.feedback_stats!.total_feedback > 0
                        ? (count / perf.feedback_stats!.total_feedback) * 100
                        : 0
                      return (
                        <div key={rating} className="flex items-center gap-2">
                          <div className="flex items-center gap-1 w-16">
                            <span className="text-xs font-medium w-4">{rating}</span>
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          </div>
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-yellow-400 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    No feedback received yet
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}


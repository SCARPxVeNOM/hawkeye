"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Clock, AlertTriangle, TrendingUp } from "lucide-react"

interface AgingBucket {
  range: string
  count: number
  incidents: any[]
}

interface AgingAnalysis {
  buckets: AgingBucket[]
  average_age: number
  oldest_incident_age: number
  sla_breaches: number
  at_risk: number
}

export default function AgingAnalysisComponent() {
  const [analysis, setAnalysis] = useState<AgingAnalysis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAgingAnalysis()
  }, [])

  const fetchAgingAnalysis = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/incidents/aging")
      if (response.ok) {
        const data = await response.json()
        setAnalysis(data)
      }
    } catch (error) {
      console.error("Error fetching aging analysis:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">Loading aging analysis...</div>
        </CardContent>
      </Card>
    )
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">No data available</div>
        </CardContent>
      </Card>
    )
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const getBucketColor = (range: string) => {
    if (range.includes("0-5") || range.includes("5-10")) return "bg-green-500"
    if (range.includes("10-15")) return "bg-yellow-500"
    if (range.includes("15-30") || range.includes("30-60")) return "bg-orange-500"
    return "bg-red-500"
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-medium text-muted-foreground">Average Age</p>
            </div>
            <p className="text-2xl font-bold">{formatTime(analysis.average_age)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-sm font-medium text-muted-foreground">SLA Breaches</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{analysis.sla_breaches}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              <p className="text-sm font-medium text-muted-foreground">At Risk</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{analysis.at_risk}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <p className="text-sm font-medium text-muted-foreground">Oldest Incident</p>
            </div>
            <p className="text-2xl font-bold">{formatTime(analysis.oldest_incident_age)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Aging Buckets */}
      <Card>
        <CardHeader>
          <CardTitle>Incident Aging Distribution</CardTitle>
          <CardDescription>Breakdown of incidents by age</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.buckets.map((bucket) => {
              const totalIncidents = analysis.buckets.reduce((sum, b) => sum + b.count, 0)
              const percentage = totalIncidents > 0 ? (bucket.count / totalIncidents) * 100 : 0

              return (
                <div key={bucket.range} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{bucket.range}</span>
                    <span className="text-muted-foreground">
                      {bucket.count} incident{bucket.count !== 1 ? "s" : ""} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${getBucketColor(bucket.range)} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


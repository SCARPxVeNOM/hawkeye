"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  MapPin, 
  Tag, 
  TrendingUp,
  Zap,
  Calendar,
  Activity
} from "lucide-react"

export interface PredictiveAlert {
  id?: string
  location: string
  category: string
  confidence: number
  message: string
  predicted_time?: string
  days_to_next_failure?: number
  ml_prediction?: boolean
  created_at?: string
}

export default function PredictiveAlerts() {
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [predicting, setPredicting] = useState(false)
  const [predictionStatus, setPredictionStatus] = useState<string | null>(null)

  const fetchAlerts = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true)
      setLoading(true)
      
      // Just fetch the predictions, don't auto-generate on every fetch
      const response = await fetch("/api/predictions?limit=20")
      if (response.ok) {
        const data = await response.json()
        setAlerts(data || [])
      } else {
        console.error("Failed to fetch predictions")
        setAlerts([])
      }
    } catch (error) {
      console.error("Error fetching alerts:", error)
      setAlerts([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const generateMLPredictions = async () => {
    try {
      setPredicting(true)
      setPredictionStatus("Generating predictions from ML model...")
      
      // Generate predictions using ML model (BentoCloud) with auto-assignment enabled
      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ use_ml: true, auto_assign: true }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to generate predictions")
      }

      const result = await response.json()
      const predictions = result.predictions || result
      const assignments = result.assignments
      
      let statusMessage = `Successfully generated ${predictions.length} predictions!`
      if (assignments) {
        statusMessage += ` ${assignments.assigned} critical alert(s) automatically assigned to technicians with 15-minute SLA.`
        if (assignments.filtered > 0) {
          statusMessage += ` ${assignments.filtered} alert(s) filtered by quality gates.`
        }
        if (assignments.failed > 0) {
          statusMessage += ` ${assignments.failed} alert(s) failed to assign.`
        }
      }
      setPredictionStatus(statusMessage)
      
      // Fetch and display the updated predictions
      await fetchAlerts(false)
      
      // Clear status message after 5 seconds
      setTimeout(() => {
        setPredictionStatus(null)
      }, 5000)
    } catch (error: any) {
      console.error("Error generating ML predictions:", error)
      setPredictionStatus(`Error: ${error.message || "Failed to generate predictions"}`)
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setPredictionStatus(null)
      }, 5000)
    } finally {
      setPredicting(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchAlerts()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh])

  const getUrgencyColor = (daysToFailure?: number, confidence?: number) => {
    if (daysToFailure !== undefined) {
      if (daysToFailure < 30) return "destructive" // High urgency - red
      if (daysToFailure < 60) return "default" // Medium urgency - orange/yellow
      return "secondary" // Low urgency - blue
    }
    // Fallback to confidence-based coloring
    if (confidence && confidence >= 75) return "destructive"
    if (confidence && confidence >= 50) return "default"
    return "secondary"
  }

  const getUrgencyLabel = (daysToFailure?: number) => {
    if (daysToFailure === undefined) return "Unknown"
    if (daysToFailure < 30) return "Critical"
    if (daysToFailure < 60) return "High"
    if (daysToFailure < 90) return "Medium"
    return "Low"
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Predictive Alerts
            </CardTitle>
            <CardDescription>
              AI-driven insights on potential future incidents powered by ML predictions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="default"
              onClick={generateMLPredictions}
              disabled={predicting}
              className="bg-primary hover:bg-primary/90"
            >
              <Zap className={`h-4 w-4 mr-2 ${predicting ? "animate-pulse" : ""}`} />
              {predicting ? "Predicting..." : "Predict"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-primary/10" : ""}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`}
              />
              {autoRefresh ? "Auto" : "Manual"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchAlerts(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Status Message */}
        {predictionStatus && (
          <div className={`mb-4 p-3 rounded-lg border ${
            predictionStatus.includes("Error") 
              ? "bg-destructive/10 border-destructive/20 text-destructive" 
              : "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
          }`}>
            <div className="flex items-center gap-2 text-sm">
              {predictionStatus.includes("Error") ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span>{predictionStatus}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading predictive alerts...</p>
            </div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed border-border">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Predictive Alerts</h3>
            <p className="text-muted-foreground mb-4">
              No patterns detected yet. Click "Predict" to fetch predictions from the ML model.
            </p>
            <Button 
              onClick={generateMLPredictions} 
              disabled={predicting}
              size="lg"
              className="bg-primary hover:bg-primary/90"
            >
              <Zap className={`h-4 w-4 mr-2 ${predicting ? "animate-pulse" : ""}`} />
              {predicting ? "Predicting from ML Model..." : "Predict from ML Model"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <div className="text-2xl font-bold text-foreground">{alerts.length}</div>
                <div className="text-sm text-muted-foreground">Total Alerts</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <div className="text-2xl font-bold text-red-500">
                  {alerts.filter(a => a.days_to_next_failure !== undefined && a.days_to_next_failure < 30).length}
                </div>
                <div className="text-sm text-muted-foreground">Critical Alerts</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <div className="text-2xl font-bold text-orange-500">
                  {alerts.filter(a => a.ml_prediction).length}
                </div>
                <div className="text-sm text-muted-foreground">ML Predictions</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <div className="text-2xl font-bold text-foreground">
                  {alerts.length > 0 ? Math.round(alerts.reduce((sum, a) => sum + (a.confidence || 0), 0) / alerts.length) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Confidence</div>
              </div>
            </div>

            {/* Process Critical Alerts Button */}
            {alerts.filter(a => a.days_to_next_failure !== undefined && a.days_to_next_failure < 30).length > 0 && (
              <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <span className="font-semibold text-yellow-800 dark:text-yellow-300">
                        {alerts.filter(a => a.days_to_next_failure !== undefined && a.days_to_next_failure < 30).length} Critical Alert(s) Detected
                      </span>
                    </div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      Click below to automatically assign these alerts to technicians with 15-minute SLA
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      try {
                        setPredicting(true)
                        setPredictionStatus("Processing critical alerts and assigning to technicians...")
                        
                        const response = await fetch("/api/predictions/process-critical", {
                          method: "POST",
                        })
                        
                        if (!response.ok) {
                          throw new Error("Failed to process critical alerts")
                        }
                        
                        const result = await response.json()
                        setPredictionStatus(
                          `Successfully assigned ${result.assigned} critical alert(s) to technicians with 15-minute SLA. ${result.failed > 0 ? `${result.failed} failed.` : ""}`
                        )
                        
                        // Refresh alerts and incidents
                        await fetchAlerts(false)
                        
                        setTimeout(() => {
                          setPredictionStatus(null)
                        }, 5000)
                      } catch (error: any) {
                        console.error("Error processing critical alerts:", error)
                        setPredictionStatus(`Error: ${error.message || "Failed to process critical alerts"}`)
                        setTimeout(() => {
                          setPredictionStatus(null)
                        }, 5000)
                      } finally {
                        setPredicting(false)
                      }
                    }}
                    disabled={predicting}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {predicting ? "Assigning..." : "Assign Critical Alerts"}
                  </Button>
                </div>
              </div>
            )}

            {/* Alerts List */}
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div
                  key={alert.id || index}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={getUrgencyColor(alert.days_to_next_failure, alert.confidence)}
                          className="flex items-center gap-1"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {getUrgencyLabel(alert.days_to_next_failure)}
                        </Badge>
                        {alert.ml_prediction && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-yellow-500" />
                            ML Prediction
                          </Badge>
                        )}
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {alert.confidence}% Confidence
                        </Badge>
                      </div>

                      {/* Message */}
                      <p className="text-sm text-foreground font-medium">{alert.message}</p>

                      {/* Details */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{alert.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          <span>{alert.category}</span>
                        </div>
                        {alert.days_to_next_failure !== undefined && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {Math.round(alert.days_to_next_failure)} days to failure
                            </span>
                          </div>
                        )}
                        {alert.predicted_time && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Predicted: {formatDate(alert.predicted_time)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"
import { RefreshCw, Clock, AlertCircle, TrendingUp, MapPin, Tag, Zap, Calendar } from "lucide-react"
import { createTooltipHTML } from "./heatmap-tooltip-fix"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(
  () => import("react-plotly.js"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading visualization...</p>
        </div>
      </div>
    ),
  }
)

export interface HeatmapDataPoint {
  location: string
  category: string
  intensity: number
  incidentCount: number
  predictionCount: number
  avgDaysToFailure?: number
}

export interface HeatmapData {
  data: HeatmapDataPoint[]
  maxIntensity: number
  locations: string[]
  categories: string[]
  lastUpdated: string
}

export default function HeatmapComponent() {
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeWindow, setTimeWindow] = useState<"24h" | "7d" | "30d" | "all">("7d")
  const [includePredictions, setIncludePredictions] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [hoveredCell, setHoveredCell] = useState<{
    location: string
    category: string
    data: HeatmapDataPoint | null
    x: number
    y: number
  } | null>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)

  const fetchHeatmapData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        timeWindow,
        includePredictions: includePredictions.toString(),
      })
      
      const response = await fetch(`/api/heatmap?${params}`)
      if (response.ok) {
        const data = await response.json()
        setHeatmapData(data)
      } else {
        console.error("Failed to fetch heatmap data")
      }
    } catch (error) {
      console.error("Error fetching heatmap data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHeatmapData()
  }, [timeWindow, includePredictions])

  // Auto-refresh every 10 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchHeatmapData()
    }, 10000) // 10 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, timeWindow, includePredictions])

  // Track mouse movement for dialog positioning
  useEffect(() => {
    if (!hoveredCell) return

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [hoveredCell])

  // Prepare data for Plotly heatmap
  const prepareHeatmapData = () => {
    if (!heatmapData || heatmapData.data.length === 0) {
      return null
    }

    const { locations, categories, data, maxIntensity } = heatmapData

    // Ensure we have valid locations and categories
    if (!locations || locations.length === 0 || !categories || categories.length === 0) {
      return null
    }

    // Create a 2D matrix: rows = locations, columns = categories
    const matrix: number[][] = []
    const hoverText: string[][] = []
    const customData: any[][] = []

    locations.forEach((location) => {
      const row: number[] = []
      const hoverRow: string[] = []
      const customRow: any[] = []
      
      categories.forEach((category) => {
        const point = data.find(
          (d) => d.location === location && d.category === category
        )
        
        if (point) {
          row.push(point.intensity)
          
          // Calculate predicted failure date
          let failureDate = ""
          let failureDateFormatted = ""
          if (point.avgDaysToFailure !== undefined && point.avgDaysToFailure > 0) {
            const date = new Date()
            date.setDate(date.getDate() + Math.round(point.avgDaysToFailure))
            failureDate = date.toISOString()
            failureDateFormatted = date.toLocaleDateString("en-US", { 
              month: "short", 
              day: "numeric", 
              year: "numeric",
              weekday: "short"
            })
          }
          
          // Determine urgency level
          let urgencyLevel = "Low"
          let urgencyColor = "#60A5FA"
          let urgencyIcon = "🟢"
          if (point.intensity >= 70) {
            urgencyLevel = "Critical"
            urgencyColor = "#EF4444"
            urgencyIcon = "🔴"
          } else if (point.intensity >= 40) {
            urgencyLevel = "High"
            urgencyColor = "#F97316"
            urgencyIcon = "🟠"
          } else if (point.intensity >= 20) {
            urgencyLevel = "Medium"
            urgencyColor = "#FBBF24"
            urgencyIcon = "🟡"
          }
          
          // Store custom data for tooltip
          customRow.push({
            location,
            category,
            intensity: point.intensity,
            incidentCount: point.incidentCount,
            predictionCount: point.predictionCount,
            avgDaysToFailure: point.avgDaysToFailure,
            failureDate,
            failureDateFormatted,
            urgencyLevel,
            urgencyColor,
            urgencyIcon,
          })
          
          // Create simpler tooltip HTML that Plotly can render
          const daysColor = point.avgDaysToFailure !== undefined
            ? (point.avgDaysToFailure < 30 ? "#EF4444" : point.avgDaysToFailure < 60 ? "#F97316" : "#3B82F6")
            : "#6B7280"
          
          let tooltip = `<b style="font-size: 16px; color: #111827;">${urgencyIcon} ${location}</b><br>`
          tooltip += `<span style="color: #6B7280;">${category}</span><br><br>`
          tooltip += `<span style="background: ${urgencyColor}15; padding: 2px 8px; border-radius: 4px; border-left: 3px solid ${urgencyColor}; font-size: 11px; font-weight: 600; color: ${urgencyColor}; text-transform: uppercase;">${urgencyLevel} Risk</span><br><br>`
          tooltip += `<b>Intensity:</b> ${point.intensity}%<br>`
          tooltip += `<b>Incidents:</b> ${point.incidentCount}<br>`
          tooltip += `<b>Predictions:</b> ${point.predictionCount}<br>`
          
          if (point.avgDaysToFailure !== undefined) {
            tooltip += `<b>Days Left:</b> <span style="color: ${daysColor}; font-weight: 700;">${Math.round(point.avgDaysToFailure)}</span><br>`
          }
          
          if (failureDateFormatted) {
            tooltip += `<br><b style="color: #DC2626; font-size: 13px;">⚠️ PREDICTED FAILURE</b><br>`
            tooltip += `<b>Failure Location:</b> ${location}<br>`
            tooltip += `<b>Category:</b> ${category}<br>`
            tooltip += `<b>Days to Failure:</b> <span style="color: ${daysColor};">${Math.round(point.avgDaysToFailure!)} days</span><br>`
            tooltip += `<b>Expected Date:</b> <span style="color: #DC2626;">${failureDateFormatted}</span>`
          }
          
          hoverRow.push(tooltip)
          
          // Keep old complex version commented for reference
          /* hoverRow.push(
            `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 320px; line-height: 1.5;">` +
            // Header with gradient background
            `<div style="background: linear-gradient(135deg, ${urgencyColor}20 0%, ${urgencyColor}10 100%); padding: 16px; border-radius: 12px 12px 0 0; border-left: 4px solid ${urgencyColor}; border-top: 1px solid ${urgencyColor}30; border-right: 1px solid ${urgencyColor}30;">` +
            `<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">` +
            `<div style="font-size: 18px;">${urgencyIcon}</div>` +
            `<div>` +
            `<div style="font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 2px;">${location}</div>` +
            `<div style="font-size: 12px; color: #6B7280; font-weight: 500;">${category}</div>` +
            `</div>` +
            `</div>` +
            `<div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: ${urgencyColor}15; border-radius: 6px; margin-top: 8px;">` +
            `<div style="width: 6px; height: 6px; border-radius: 50%; background: ${urgencyColor};"></div>` +
            `<span style="font-size: 11px; font-weight: 600; color: ${urgencyColor}; text-transform: uppercase; letter-spacing: 0.5px;">${urgencyLevel} Risk</span>` +
            `</div>` +
            `</div>` +
            // Metrics section
            `<div style="padding: 16px; background: #FFFFFF; border-left: 4px solid ${urgencyColor}; border-right: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB;">` +
            `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: ${point.avgDaysToFailure !== undefined ? '12px' : '0'};">` +
            `<div style="padding: 10px; background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">` +
            `<div style="font-size: 10px; color: #6B7280; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Intensity</div>` +
            `<div style="font-size: 18px; font-weight: 700; color: #111827;">${point.intensity}%</div>` +
            `</div>` +
            `<div style="padding: 10px; background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">` +
            `<div style="font-size: 10px; color: #6B7280; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Incidents</div>` +
            `<div style="font-size: 18px; font-weight: 700; color: #111827;">${point.incidentCount}</div>` +
            `</div>` +
            `<div style="padding: 10px; background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">` +
            `<div style="font-size: 10px; color: #6B7280; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Predictions</div>` +
            `<div style="font-size: 18px; font-weight: 700; color: #111827;">${point.predictionCount}</div>` +
            `</div>` +
            (point.avgDaysToFailure !== undefined 
              ? `<div style="padding: 10px; background: ${daysColor}10; border-radius: 8px; border: 1px solid ${daysColor}30;">` +
                `<div style="font-size: 10px; color: ${daysColor}; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Days Left</div>` +
                `<div style="font-size: 18px; font-weight: 700; color: ${daysColor};">${Math.round(point.avgDaysToFailure)}</div>` +
                `</div>`
              : `<div></div>`) +
            `</div>` +
            // Failure prediction section
            (point.avgDaysToFailure !== undefined && point.avgDaysToFailure > 0
              ? `<div style="padding: 14px; background: linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%); border-top: 2px solid #EF4444; border-left: 4px solid #EF4444; border-right: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; border-radius: 0 0 12px 12px;">` +
                `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">` +
                `<div style="font-size: 16px;">⚠️</div>` +
                `<div style="font-size: 13px; font-weight: 700; color: #991B1B;">Predicted Failure Location</div>` +
                `</div>` +
                `<div style="padding: 10px; background: #FFFFFF; border-radius: 8px; border: 1px solid #FCA5A5; margin-bottom: 8px;">` +
                `<div style="font-size: 11px; color: #6B7280; margin-bottom: 4px;">📍 Location</div>` +
                `<div style="font-size: 13px; font-weight: 600; color: #111827;">${location}</div>` +
                `</div>` +
                `<div style="padding: 10px; background: #FFFFFF; border-radius: 8px; border: 1px solid #FCA5A5; margin-bottom: 8px;">` +
                `<div style="font-size: 11px; color: #6B7280; margin-bottom: 4px;">🏷️ Category</div>` +
                `<div style="font-size: 13px; font-weight: 600; color: #111827;">${category}</div>` +
                `</div>` +
                `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">` +
                `<div style="padding: 10px; background: #FFFFFF; border-radius: 8px; border: 1px solid #FCA5A5;">` +
                `<div style="font-size: 11px; color: #6B7280; margin-bottom: 4px;">⏱️ Days to Failure</div>` +
                `<div style="font-size: 14px; font-weight: 700; color: #DC2626;">${Math.round(point.avgDaysToFailure)} days</div>` +
                `</div>` +
                `<div style="padding: 10px; background: #FFFFFF; border-radius: 8px; border: 1px solid #FCA5A5;">` +
                `<div style="font-size: 11px; color: #6B7280; margin-bottom: 4px;">📅 Expected Date</div>` +
                `<div style="font-size: 12px; font-weight: 700; color: #DC2626;">${failureDateFormatted}</div>` +
                `</div>` +
                `</div>` +
                `</div>`
              : "") +
            `</div>` +
            `</div>`
          ) */
        } else {
          row.push(0)
          customRow.push(null)
          hoverRow.push(
            `<div style="font-family: system-ui, sans-serif; padding: 8px;">` +
            `<div style="font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 6px;">${location}</div>` +
            `<div style="font-size: 12px; color: #6B7280; margin-bottom: 8px;">${category}</div>` +
            `<div style="padding: 8px; background: #F9FAFB; border-radius: 4px; border: 1px solid #E5E7EB;">` +
            `<span style="font-size: 12px; color: #9CA3AF;">✓ No activity detected</span>` +
            `</div>` +
            `</div>`
          )
        }
      })
      
      matrix.push(row)
      hoverText.push(hoverRow)
      customData.push(customRow)
    })

    // Professional color scale - from cool (low) to hot (high)
    return {
      z: matrix,
      x: categories,
      y: locations,
      text: hoverText,
      customdata: customData,
      type: "heatmap",
      hoverinfo: "text",
      colorscale: [
        [0, "#E3F2FD"],      // Very light blue
        [0.2, "#90CAF9"],    // Light blue
        [0.4, "#42A5F5"],    // Medium blue
        [0.6, "#1E88E5"],    // Blue
        [0.75, "#FFB74D"],   // Light orange
        [0.85, "#FF9800"],   // Orange
        [0.95, "#F57C00"],   // Dark orange
        [1, "#D32F2F"],      // Red
      ],
      xgap: 3,
      ygap: 3,
      showscale: true,
      colorbar: {
        title: {
          text: "Intensity<br>Score",
          font: { size: 12, color: "#374151", family: "system-ui, -apple-system, sans-serif" },
        },
        titleside: "right",
        thickness: 22,
        len: 0.85,
        x: 1.02,
        xpad: 8,
        tickfont: { size: 10, color: "#6B7280", family: "system-ui, -apple-system, sans-serif" },
        tickformat: ".0f",
        outlinewidth: 1,
        outlinecolor: "#E5E7EB",
        bgcolor: "rgba(255,255,255,0.8)",
        bordercolor: "#E5E7EB",
        borderwidth: 1,
      },
      text: hoverText,
      hovertemplate: "%{text}<extra></extra>",
      hoverinfo: "text",
      hoverlabel: {
        bgcolor: "white",
        bordercolor: "#E5E7EB",
        font: { size: 12 },
      },
    }
  }

  const plotData = prepareHeatmapData()

  return (
    <Card>
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <AlertCircle className="h-5 w-5 text-primary" />
              </div>
              Issue Hotspots Heatmap
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              Real-time visualization of incident density and ML-powered failure predictions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-primary/10 border-primary/20" : ""}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`}
              />
              {autoRefresh ? "Auto" : "Manual"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchHeatmapData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="mb-6 bg-muted/30 rounded-lg p-4 border border-border/50">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-foreground">Time Window:</label>
              <div className="flex gap-1.5">
                {(["24h", "7d", "30d", "all"] as const).map((window) => (
                  <Button
                    key={window}
                    variant={timeWindow === window ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeWindow(window)}
                    className={timeWindow === window ? "shadow-sm" : ""}
                  >
                    {window === "all" ? "All Time" : window}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-foreground">Include Predictions:</label>
              <Button
                variant={includePredictions ? "default" : "outline"}
                size="sm"
                onClick={() => setIncludePredictions(!includePredictions)}
                className={includePredictions ? "shadow-sm" : ""}
              >
                {includePredictions ? "Yes" : "No"}
              </Button>
            </div>

            {heatmapData && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Last Updated:</span>
                <span>{new Date(heatmapData.lastUpdated).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Heatmap Visualization */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading heatmap data...</p>
            </div>
          </div>
        ) : !plotData ? (
          <div className="flex items-center justify-center h-96 border border-dashed rounded-lg">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No Data Available</p>
              <p className="text-sm text-muted-foreground">
                No incidents or predictions found for the selected time window.
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full bg-gradient-to-br from-background via-background to-muted/10 rounded-xl p-6 border border-border shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>Live data • Hover over cells for detailed failure predictions</span>
              </div>
            </div>
            <div 
              className="relative"
              onMouseMove={(e) => {
                if (hoveredCell) {
                  setMousePosition({ x: e.clientX, y: e.clientY })
                }
              }}
              onMouseLeave={() => {
                setHoveredCell(null)
                setMousePosition(null)
              }}
            >
            <Plot
              data={[plotData]}
              onHover={(data) => {
                if (data.points && data.points.length > 0) {
                  const point = data.points[0]
                  const location = point.y as string
                  const category = point.x as string
                  
                  // Find the data point
                  const cellData = heatmapData?.data.find(
                    (d) => d.location === location && d.category === category
                  )
                  
                  // Get mouse position from event
                  let mouseX = 0
                  let mouseY = 0
                  if (data.event) {
                    const event = data.event as MouseEvent
                    mouseX = event.clientX || 0
                    mouseY = event.clientY || 0
                  }
                  
                  setHoveredCell({
                    location,
                    category,
                    data: cellData || null,
                    x: point.x as number,
                    y: point.y as number,
                  })
                  
                  setMousePosition({
                    x: mouseX,
                    y: mouseY,
                  })
                }
              }}
              onUnhover={() => {
                // Delay hiding to allow moving to dialog
                setTimeout(() => {
                  if (!document.querySelector('[data-hover-dialog]')) {
                    setHoveredCell(null)
                    setMousePosition(null)
                  }
                }, 100)
              }}
              layout={{
                title: {
                  text: "",
                  font: { size: 0 },
                },
                xaxis: {
                  title: {
                    text: "<b>Category</b>",
                    font: { size: 14, color: "#1F2937", family: "system-ui, -apple-system, sans-serif" },
                  },
                  side: "bottom",
                  tickangle: -45,
                  tickfont: { size: 11, color: "#4B5563", family: "system-ui, -apple-system, sans-serif" },
                  gridcolor: "#E5E7EB",
                  gridwidth: 1.5,
                  showgrid: true,
                  zeroline: false,
                  linecolor: "#D1D5DB",
                  linewidth: 1.5,
                  showline: true,
                },
                yaxis: {
                  title: {
                    text: "<b>Location</b>",
                    font: { size: 14, color: "#1F2937", family: "system-ui, -apple-system, sans-serif" },
                  },
                  autorange: "reversed",
                  tickfont: { size: 11, color: "#4B5563", family: "system-ui, -apple-system, sans-serif" },
                  gridcolor: "#E5E7EB",
                  gridwidth: 1.5,
                  showgrid: true,
                  zeroline: false,
                  linecolor: "#D1D5DB",
                  linewidth: 1.5,
                  showline: true,
                },
                margin: { 
                  l: Math.max(140, heatmapData.locations.reduce((max, loc) => Math.max(max, loc.length * 8), 140)), 
                  r: 90, 
                  t: 30, 
                  b: Math.max(110, heatmapData.categories.reduce((max, cat) => Math.max(max, cat.length * 6), 110))
                },
                height: Math.max(550, Math.min(heatmapData.locations.length * 45 + 180, 850)),
                autosize: true,
                hovermode: "closest",
                hoverlabel: {
                  bgcolor: "white",
                  bordercolor: "#E5E7EB",
                  borderwidth: 2,
                  font: { size: 12, family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#111827" },
                  align: "left",
                  namelength: -1,
                },
                hoverdistance: 20,
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
                font: {
                  family: "system-ui, -apple-system, sans-serif",
                },
              }}
              config={{
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ["pan2d", "lasso2d", "select2d", "autoScale2d"],
                responsive: true,
                toImageButtonOptions: {
                  format: "png",
                  filename: "heatmap",
                  height: 800,
                  width: 1200,
                  scale: 2,
                },
              }}
              style={{ width: "100%", height: "100%", minHeight: "500px" }}
            />
            
            {/* Hover Dialog */}
            {hoveredCell && mousePosition && (
              <div
                data-hover-dialog
                className="fixed z-50 pointer-events-none"
                style={{
                  left: typeof window !== 'undefined' 
                    ? `${Math.min(mousePosition.x + 20, window.innerWidth - 420)}px`
                    : `${mousePosition.x + 20}px`,
                  top: typeof window !== 'undefined'
                    ? `${Math.min(mousePosition.y + 20, window.innerHeight - 400)}px`
                    : `${mousePosition.y + 20}px`,
                  maxWidth: '400px',
                }}
                onMouseEnter={() => {}}
                onMouseLeave={() => {
                  setHoveredCell(null)
                  setMousePosition(null)
                }}
              >
                <CellDetailDialog cell={hoveredCell} />
              </div>
            )}
            </div>
          </div>
        )}

        {/* Legend/Stats */}
        {heatmapData && heatmapData.data.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border/50">
            <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
              <h4 className="text-sm font-semibold text-foreground mb-3">Intensity Scale</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border border-border" style={{ backgroundColor: "#E3F2FD" }}></div>
                  <div>
                    <div className="text-xs font-medium text-foreground">Very Low</div>
                    <div className="text-xs text-muted-foreground">0-20%</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border border-border" style={{ backgroundColor: "#42A5F5" }}></div>
                  <div>
                    <div className="text-xs font-medium text-foreground">Low</div>
                    <div className="text-xs text-muted-foreground">20-40%</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border border-border" style={{ backgroundColor: "#FF9800" }}></div>
                  <div>
                    <div className="text-xs font-medium text-foreground">Medium</div>
                    <div className="text-xs text-muted-foreground">40-70%</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border border-border" style={{ backgroundColor: "#D32F2F" }}></div>
                  <div>
                    <div className="text-xs font-medium text-foreground">High</div>
                    <div className="text-xs text-muted-foreground">70-100%</div>
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                <strong>Intensity Calculation:</strong> Combines incident count (0-50 points), prediction count (0-30 points), 
                and urgency based on days to failure. Higher values indicate areas requiring immediate attention. 
                Hover over cells for detailed information.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Cell Detail Dialog Component
function CellDetailDialog({ cell }: { cell: { location: string; category: string; data: HeatmapDataPoint | null } }) {
  if (!cell.data) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-xl p-4 pointer-events-auto">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">{cell.location}</h3>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{cell.category}</span>
        </div>
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
          No activity detected in this zone
        </div>
      </div>
    )
  }

  const { location, category, intensity, incidentCount, predictionCount, avgDaysToFailure } = cell.data

  // Calculate predicted failure date
  let failureDate = ""
  if (avgDaysToFailure !== undefined && avgDaysToFailure > 0) {
    const date = new Date()
    date.setDate(date.getDate() + Math.round(avgDaysToFailure))
    failureDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      weekday: "short",
    })
  }

  // Determine urgency
  let urgencyLevel = "Low"
  let urgencyColor = "secondary"
  let urgencyIcon = "🟢"
  if (intensity >= 70) {
    urgencyLevel = "Critical"
    urgencyColor = "destructive"
    urgencyIcon = "🔴"
  } else if (intensity >= 40) {
    urgencyLevel = "High"
    urgencyColor = "default"
    urgencyIcon = "🟠"
  } else if (intensity >= 20) {
    urgencyLevel = "Medium"
    urgencyColor = "default"
    urgencyIcon = "🟡"
  }

  const daysColor = avgDaysToFailure !== undefined
    ? (avgDaysToFailure < 30 ? "text-red-500" : avgDaysToFailure < 60 ? "text-orange-500" : "text-blue-500")
    : "text-muted-foreground"

  return (
    <div 
      className="bg-card border border-border rounded-lg shadow-2xl p-5 pointer-events-auto max-w-md"
      style={{ 
        background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 100%)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Header */}
      <div className="mb-4 pb-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{urgencyIcon}</span>
          <h3 className="font-bold text-lg text-foreground">{location}</h3>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{category}</span>
        </div>
        <Badge variant={urgencyColor as any} className="flex items-center gap-1 w-fit">
          <AlertCircle className="h-3 w-3" />
          {urgencyLevel} Risk
        </Badge>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Intensity</div>
          <div className="text-2xl font-bold text-foreground">{intensity}%</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Incidents</div>
          <div className="text-2xl font-bold text-foreground">{incidentCount}</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Predictions</div>
          <div className="text-2xl font-bold text-foreground">{predictionCount}</div>
        </div>
        {avgDaysToFailure !== undefined && (
          <div className={`bg-muted/50 rounded-lg p-3 border border-border ${daysColor}`}>
            <div className="text-xs text-muted-foreground mb-1">Days Left</div>
            <div className={`text-2xl font-bold ${daysColor}`}>{Math.round(avgDaysToFailure)}</div>
          </div>
        )}
      </div>

      {/* Failure Prediction Section */}
      {avgDaysToFailure !== undefined && avgDaysToFailure > 0 && (
        <div className="mt-4 pt-4 border-t border-red-200 bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <h4 className="font-bold text-red-700 dark:text-red-400">Predicted Failure Location</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Location:</span>
              <span className="font-semibold text-foreground">{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Category:</span>
              <span className="font-semibold text-foreground">{category}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Days to Failure:</span>
              <span className={`font-bold ${daysColor}`}>{Math.round(avgDaysToFailure)} days</span>
            </div>
            {failureDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Expected Date:</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{failureDate}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


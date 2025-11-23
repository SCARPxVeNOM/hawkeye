// Helper to create simpler tooltip HTML that Plotly can render
export function createTooltipHTML(
  location: string,
  category: string,
  intensity: number,
  incidentCount: number,
  predictionCount: number,
  avgDaysToFailure?: number,
  urgencyLevel: string = "Low",
  urgencyColor: string = "#60A5FA",
  urgencyIcon: string = "🟢"
): string {
  const failureDateFormatted = avgDaysToFailure && avgDaysToFailure > 0
    ? (() => {
        const date = new Date()
        date.setDate(date.getDate() + Math.round(avgDaysToFailure))
        return date.toLocaleDateString("en-US", { 
          month: "short", 
          day: "numeric", 
          year: "numeric",
          weekday: "short"
        })
      })()
    : null

  const daysColor = avgDaysToFailure !== undefined
    ? (avgDaysToFailure < 30 ? "#EF4444" : avgDaysToFailure < 60 ? "#F97316" : "#3B82F6")
    : "#6B7280"

  let tooltip = `<b style="font-size: 16px; color: #111827;">${urgencyIcon} ${location}</b><br>`
  tooltip += `<span style="color: #6B7280;">${category}</span><br><br>`
  tooltip += `<span style="background: ${urgencyColor}15; padding: 2px 8px; border-radius: 4px; border-left: 3px solid ${urgencyColor}; font-size: 11px; font-weight: 600; color: ${urgencyColor}; text-transform: uppercase;">${urgencyLevel} Risk</span><br><br>`
  
  tooltip += `<table style="width: 100%; font-size: 12px; border-collapse: collapse;">`
  tooltip += `<tr><td style="padding: 3px 6px; color: #6B7280;">Intensity:</td><td style="padding: 3px 6px; font-weight: 600; color: #111827;">${intensity}%</td></tr>`
  tooltip += `<tr><td style="padding: 3px 6px; color: #6B7280;">Incidents:</td><td style="padding: 3px 6px; font-weight: 600; color: #111827;">${incidentCount}</td></tr>`
  tooltip += `<tr><td style="padding: 3px 6px; color: #6B7280;">Predictions:</td><td style="padding: 3px 6px; font-weight: 600; color: #111827;">${predictionCount}</td></tr>`
  
  if (avgDaysToFailure !== undefined) {
    tooltip += `<tr><td style="padding: 3px 6px; color: #6B7280;">Days Left:</td><td style="padding: 3px 6px; font-weight: 600; color: ${daysColor};">${Math.round(avgDaysToFailure)}</td></tr>`
  }
  
  tooltip += `</table>`
  
  if (failureDateFormatted) {
    tooltip += `<br><b style="color: #DC2626; font-size: 13px;">⚠️ PREDICTED FAILURE</b><br>`
    tooltip += `<b>Location:</b> ${location}<br>`
    tooltip += `<b>Category:</b> ${category}<br>`
    tooltip += `<b>Days to Failure:</b> <span style="color: ${daysColor};">${Math.round(avgDaysToFailure!)} days</span><br>`
    tooltip += `<b>Expected Date:</b> <span style="color: #DC2626;">${failureDateFormatted}</span>`
  }
  
  return tooltip
}


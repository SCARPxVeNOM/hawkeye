"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, Send, CheckCircle2 } from "lucide-react"

interface TechnicianFeedbackFormProps {
  incidentId: string
  technicianId: string | null
  userId: string
  onSuccess?: () => void
}

export default function TechnicianFeedbackForm({
  incidentId,
  technicianId,
  userId,
  onSuccess,
}: TechnicianFeedbackFormProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [existingFeedback, setExistingFeedback] = useState<any>(null)

  useEffect(() => {
    // Check if feedback already exists
    fetchExistingFeedback()
  }, [incidentId])

  const fetchExistingFeedback = async () => {
    try {
      const response = await fetch(`/api/feedback/${incidentId}`)
      if (response.ok) {
        const data = await response.json()
        setExistingFeedback(data)
        setRating(data.rating)
        setComment(data.comment || "")
        setSubmitted(true)
      }
    } catch (error) {
      // No existing feedback, that's fine
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!technicianId) {
      alert("No technician assigned to this incident")
      return
    }

    if (rating === 0) {
      alert("Please select a rating")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_id: incidentId,
          technician_id: technicianId,
          user_id: userId,
          rating,
          comment: comment.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to submit feedback")
      }

      setSubmitted(true)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      alert(error.message || "Failed to submit feedback")
    } finally {
      setLoading(false)
    }
  }

  if (!technicianId) {
    return (
      <Card className="mt-4">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            No technician assigned to this incident yet
          </p>
        </CardContent>
      </Card>
    )
  }

  if (submitted && existingFeedback) {
    return (
      <Card className="mt-4 border-green-200 bg-green-50/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-900">Feedback Submitted</h3>
          </div>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
            <span className="ml-2 text-sm font-medium">{rating}/5</span>
          </div>
          {comment && (
            <p className="text-sm text-muted-foreground mt-2 italic">"{comment}"</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Rate Technician Service</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300 hover:text-yellow-200"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  {rating}/5
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Comment (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with the technician..."
              className="w-full min-h-[100px] px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-sm"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {comment.length}/500 characters
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading || rating === 0}
            className="w-full"
          >
            {loading ? (
              "Submitting..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}



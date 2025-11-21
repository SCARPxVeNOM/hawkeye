"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MapPin, Upload, Loader2, Send } from "lucide-react"

interface IncidentFormProps {
  onSubmit?: (data: any) => void
  onSuccess?: () => void
}

export default function IncidentForm({ onSubmit, onSuccess }: IncidentFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    category: "water",
    description: "",
    location: "",
    latitude: "",
    longitude: "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImageFile(e.target.files[0])
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          }))
        },
        (error) => {
          setError("Unable to get current location: " + error.message)
        },
      )
    } else {
      setError("Geolocation is not supported by your browser")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (!formData.title || !formData.description || !formData.location) {
      setError("Please fill in all required fields")
      setLoading(false)
      return
    }

    // Check for duplicate incidents
    const existingIncidents = JSON.parse(localStorage.getItem("incidents") || "[]")
    const isDuplicate = existingIncidents.some(
      (inc: any) =>
        inc.category === formData.category &&
        inc.location === formData.location &&
        new Date(inc.created_at).toDateString() === new Date().toDateString(),
    )

    if (isDuplicate) {
      setError("An incident for this category and location already exists today")
      setLoading(false)
      return
    }

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const incident = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        image_url: imageFile ? URL.createObjectURL(imageFile) : null,
        status: "new",
        priority: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      existingIncidents.push(incident)
      localStorage.setItem("incidents", JSON.stringify(existingIncidents))

      if (onSubmit) {
        onSubmit(incident)
      }

      // Reset form
      setFormData({
        title: "",
        category: "water",
        description: "",
        location: "",
        latitude: "",
        longitude: "",
      })
      setImageFile(null)

      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl shadow-xl border-none overflow-hidden">
      <div className="bg-primary p-6 text-primary-foreground">
        <h2 className="text-xl font-bold">Report New Issue</h2>
        <p className="text-primary-foreground/70 text-sm mt-1">Please provide details about the incident</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-card">
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
            <span className="text-lg">⚠️</span> {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Issue Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-border bg-muted/30 focus:bg-background focus:ring-2 focus:ring-secondary focus:border-secondary transition-all outline-none"
            placeholder="E.g., Water leakage in bathroom"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Category *</label>
            <div className="relative">
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-border bg-muted/30 focus:bg-background focus:ring-2 focus:ring-secondary focus:border-secondary transition-all outline-none appearance-none cursor-pointer"
                required
              >
                <option value="water">💧 Water</option>
                <option value="electricity">⚡ Electricity</option>
                <option value="garbage">🗑️ Garbage</option>
                <option value="it">💻 IT / Network</option>
                <option value="hostel">🏢 Hostel Infrastructure</option>
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-muted-foreground">
                ▼
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Location *</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-border bg-muted/30 focus:bg-background focus:ring-2 focus:ring-secondary focus:border-secondary transition-all outline-none"
              placeholder="Building/Room No."
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-border bg-muted/30 focus:bg-background focus:ring-2 focus:ring-secondary focus:border-secondary transition-all outline-none resize-none"
            rows={4}
            placeholder="Please describe the issue in detail..."
            required
          />
        </div>

        <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-secondary" /> Location Coordinates
            </label>
            <Button
              type="button"
              onClick={getCurrentLocation}
              variant="outline"
              size="sm"
              className="text-xs border-secondary text-secondary hover:bg-secondary hover:text-white transition-colors bg-transparent"
            >
              Get Current Location
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs text-muted-foreground"
              placeholder="Latitude"
              readOnly
            />
            <input
              type="text"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs text-muted-foreground"
              placeholder="Longitude"
              readOnly
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Attachment (Optional)</label>
          <div className="relative group">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-full px-4 py-8 rounded-xl border-2 border-dashed border-border bg-muted/10 group-hover:bg-muted/30 group-hover:border-secondary/50 transition-all flex flex-col items-center justify-center text-center">
              {imageFile ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center mb-2 text-secondary">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{imageFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Click to change file</p>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2 text-muted-foreground group-hover:text-secondary transition-colors">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Click to upload image</p>
                  <p className="text-xs text-muted-foreground mt-1">SVG, PNG, JPG or GIF (max. 3MB)</p>
                </>
              )}
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity shadow-lg shadow-secondary/20"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...
            </>
          ) : (
            <>
              Submit Report <Send className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </form>
    </Card>
  )
}

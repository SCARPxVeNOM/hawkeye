"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle2, Image as ImageIcon, Calendar, MapPin, User } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CompletedTask {
  id: string
  title: string
  location: string
  category: string
  completion_image: string | null
  completed_at: string | null
  completed_by: string | null
  technician_name?: string
  created_at: string
}

export default function CompletedTasks() {
  const [tasks, setTasks] = useState<CompletedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    fetchCompletedTasks()
    // Refresh every 30 seconds
    const interval = setInterval(fetchCompletedTasks, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchCompletedTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/incidents?status=resolved&limit=20")
      if (response.ok) {
        const incidents = await response.json()
        // Filter and format completed tasks with images
        const completedTasks = incidents
          .filter((incident: any) => 
            incident.status === "resolved" && 
            incident.completion_image
          )
          .map((incident: any) => ({
            id: incident.id,
            title: incident.title,
            location: incident.location,
            category: incident.category,
            completion_image: incident.completion_image,
            completed_at: incident.completed_at || incident.resolved_at,
            completed_by: incident.completed_by,
            created_at: incident.created_at,
          }))
          .sort((a: any, b: any) => {
            const dateA = new Date(a.completed_at || 0).getTime()
            const dateB = new Date(b.completed_at || 0).getTime()
            return dateB - dateA
          })

        // Fetch technician names for completed_by IDs
        const tasksWithNames = await Promise.all(
          completedTasks.map(async (task: CompletedTask) => {
            if (task.completed_by) {
              try {
                // Try to get technician from technicians list
                const techResponse = await fetch("/api/technicians")
                if (techResponse.ok) {
                  const technicians = await techResponse.json()
                  const tech = technicians.find((t: any) => t.id === task.completed_by)
                  if (tech) {
                    return { ...task, technician_name: tech.name || "Unknown Technician" }
                  }
                }
              } catch (error) {
                console.error("Error fetching technician:", error)
              }
            }
            return { ...task, technician_name: "Unknown Technician" }
          })
        )

        setTasks(tasksWithNames)
      }
    } catch (error) {
      console.error("Error fetching completed tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Completed Tasks</CardTitle>
          <CardDescription>Tasks completed by technicians with images</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Completed Tasks
          </CardTitle>
          <CardDescription>
            Tasks completed by technicians with completion images ({tasks.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No completed tasks with images yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow bg-card"
                >
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3" />
                        <span>{task.location}</span>
                      </div>
                      <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                        {task.category}
                      </span>
                    </div>

                    {task.completion_image && (
                      <div className="relative">
                        <img
                          src={task.completion_image}
                          alt="Completion proof"
                          className="w-full h-48 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedImage(task.completion_image!)}
                        />
                        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          Proof
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{task.technician_name}</span>
                      </div>
                      {task.completed_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(task.completed_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedImage}
              alt="Completion proof"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-4 right-4"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </Button>
          </div>
        </div>
      )}
    </>
  )
}


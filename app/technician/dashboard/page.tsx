"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Calendar,
  LogOut,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Settings,
} from "lucide-react"

interface Assignment {
  id: string
  incident_id: string
  incident_title: string
  location: string
  scheduled_time: string
  status: string
}

export default function TechnicianDashboardPage() {
  const router = useRouter()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("technicianUser") || "{}")
    if (!userData.id) {
      router.push("/technician/login")
      return
    }
    setUser(userData)
    fetchAssignments(userData.id)
  }, [])

  const fetchAssignments = async (technicianId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/technicians/${technicianId}/assignments`)
      if (response.ok) {
        const data = await response.json()
        setAssignments(data)
      }
    } catch (error) {
      console.error("Error fetching assignments:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateAssignmentStatus = async (assignmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/technicians/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchAssignments(user.id)
      }
    } catch (error) {
      console.error("Error updating assignment:", error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("technicianToken")
    localStorage.removeItem("technicianUser")
    router.push("/")
  }

  const activeAssignments = assignments.filter((a) => a.status !== "completed")
  const completedAssignments = assignments.filter((a) => a.status === "completed")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Technician Portal</h1>
                <p className="text-sm text-muted-foreground">
                  {user?.name} • {user?.specialization}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Assignments</p>
                  <p className="text-3xl font-bold text-foreground">{activeAssignments.length}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-foreground">{completedAssignments.length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Assignments</p>
                  <p className="text-3xl font-bold text-foreground">{assignments.length}</p>
                </div>
                <LayoutDashboard className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Assignments */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Active Assignments</CardTitle>
            <CardDescription>Your current and scheduled tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : activeAssignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No active assignments</div>
            ) : (
              <div className="space-y-4">
                {activeAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{assignment.incident_title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{assignment.location}</p>
                        <p className="text-xs text-muted-foreground">
                          Scheduled: {new Date(assignment.scheduled_time).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {assignment.status === "scheduled" && (
                          <Button
                            size="sm"
                            onClick={() => updateAssignmentStatus(assignment.id, "in-progress")}
                          >
                            Start
                          </Button>
                        )}
                        {assignment.status === "in-progress" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateAssignmentStatus(assignment.id, "completed")}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Assignments */}
        {completedAssignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Completed Assignments</CardTitle>
              <CardDescription>Recently completed tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedAssignments.slice(0, 5).map((assignment) => (
                  <div
                    key={assignment.id}
                    className="p-4 border border-border rounded-lg bg-muted/30"
                  >
                    <h3 className="font-semibold text-foreground mb-1">{assignment.incident_title}</h3>
                    <p className="text-sm text-muted-foreground">{assignment.location}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}


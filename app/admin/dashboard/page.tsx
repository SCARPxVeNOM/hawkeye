"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useState, useEffect } from "react"
import AnalyticsOverview from "@/components/analytics-overview"
import TechnicianScheduler from "@/components/technician-scheduler"
import SLAMonitor from "@/components/sla-monitor"
import {
  LayoutDashboard,
  Users,
  AlertCircle,
  Calendar,
  Settings,
  LogOut,
  Map,
  Activity,
  Search,
  Bell,
  Menu,
  ChevronRight,
  BarChart3,
  Shield,
  Clock,
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2,
  UserCog,
  Ban,
  CheckCircle2,
  Mail,
} from "lucide-react"
import TechnicianPerformanceComponent from "@/components/technician-performance"
import AgingAnalysisComponent from "@/components/aging-analysis"
import NotificationsDropdown from "@/components/notifications-dropdown"
import HeatmapComponent from "@/components/heatmap"
import PredictiveAlerts from "@/components/predictive-alerts"
import CompletedTasks from "@/components/completed-tasks"

export default function AdminDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [incidents, setIncidents] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [adminUserId, setAdminUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchIncidents()
    fetchPredictions()
    
    // Get admin user ID from localStorage (client-side only)
    if (typeof window !== "undefined") {
      const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}")
      if (adminUser.id) {
        setAdminUserId(adminUser.id)
      }
    }

    // Auto-check SLA escalations every 2 minutes
    const escalationInterval = setInterval(async () => {
      try {
        await fetch("/api/escalation/check", { method: "POST" })
        // Refresh incidents after escalation check
        fetchIncidents()
      } catch (error) {
        console.error("Error in automatic SLA check:", error)
      }
    }, 120000) // 2 minutes

    return () => clearInterval(escalationInterval)
  }, [])

  const fetchIncidents = async () => {
    try {
      const response = await fetch("/api/incidents")
      if (response.ok) {
        const data = await response.json()
        // If API returns empty array, try localStorage as fallback
        if (Array.isArray(data) && data.length === 0) {
          const stored = JSON.parse(localStorage.getItem("incidents") || "[]")
          if (stored.length > 0) {
            setIncidents(stored)
            await fetchPredictions()
            return
          }
        }
        setIncidents(data)
        await fetchPredictions()
      } else {
        console.error("Failed to fetch incidents")
        // Fallback to localStorage for backward compatibility
        const stored = JSON.parse(localStorage.getItem("incidents") || "[]")
        setIncidents(stored)
      }
    } catch (error) {
      console.error("Error fetching incidents:", error)
      // Fallback to localStorage
      const stored = JSON.parse(localStorage.getItem("incidents") || "[]")
      setIncidents(stored)
    }
  }

  const fetchPredictions = async () => {
    try {
      const response = await fetch("/api/predictions")
      if (response.ok) {
        const data = await response.json()
        setPredictions(data)
      } else {
        console.error("Failed to fetch predictions")
        setPredictions([])
      }
    } catch (error) {
      console.error("Error fetching predictions:", error)
      setPredictions([])
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("adminToken")
    router.push("/")
  }

  const updateIncidentStatus = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Refresh incidents from database
        fetchIncidents()
      } else {
        // Fallback to local update
        const updated = incidents.map((inc) =>
          inc.id === id ? { ...inc, status: newStatus, updated_at: new Date().toISOString() } : inc,
        )
        setIncidents(updated)
        localStorage.setItem("incidents", JSON.stringify(updated))
      }
    } catch (error) {
      console.error("Error updating incident:", error)
      // Fallback to local update
      const updated = incidents.map((inc) =>
        inc.id === id ? { ...inc, status: newStatus, updated_at: new Date().toISOString() } : inc,
      )
      setIncidents(updated)
      localStorage.setItem("incidents", JSON.stringify(updated))
    }
  }

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "incidents", label: "Incidents", icon: AlertCircle },
    { id: "scheduling", label: "Scheduling", icon: Calendar },
    { id: "sla", label: "SLA Monitor", icon: Activity },
    { id: "aging", label: "Aging Analysis", icon: Clock },
    { id: "performance", label: "Technician Performance", icon: TrendingUp },
    { id: "heatmap", label: "Heatmap", icon: Map },
    { id: "predictions", label: "Predictions", icon: BarChart3 },
    { id: "users", label: "User Management", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "w-16"
        } bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col fixed h-full z-20`}
      >
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 font-semibold text-sidebar-primary">
            <Shield className="h-6 w-6" />
            {isSidebarOpen && <span>AdminPanel</span>}
          </div>
        </div>

        <div className="flex-1 py-4 overflow-y-auto">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeTab === item.id
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {isSidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary transition-colors`}
          >
            <LogOut className="h-4 w-4" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-16"}`}
      >
        {/* Header */}
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center text-sm text-muted-foreground">
              <span>Campus</span>
              <ChevronRight className="h-4 w-4 mx-1" />
              <span className="text-foreground font-medium">
                {navItems.find((i) => i.id === activeTab)?.label || "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {adminUserId ? (
              <NotificationsDropdown userId={adminUserId} />
            ) : (
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
              </Button>
            )}
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-teal-500 flex items-center justify-center text-xs font-bold text-white">
              AD
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <AnalyticsOverview />
                <CompletedTasks />
              </div>
            )}

            {activeTab === "incidents" && (
              <Card>
                <CardHeader>
                  <CardTitle>All Reported Incidents</CardTitle>
                  <CardDescription>Manage and track all campus incidents.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {incidents.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">No incidents found</div>
                    ) : (
                      incidents.map((incident: any) => (
                        <div
                          key={incident.id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground truncate">{incident.title}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                                {incident.category}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{incident.location}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <select
                              value={incident.status}
                              onChange={(e) => updateIncidentStatus(incident.id, e.target.value)}
                              className="h-8 text-xs px-2 border border-input bg-background rounded-md focus:ring-1 focus:ring-ring outline-none"
                            >
                              <option value="new">New</option>
                              <option value="in-progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "scheduling" && <TechnicianScheduler />}

            {activeTab === "sla" && <SLAMonitor />}

            {activeTab === "aging" && <AgingAnalysisComponent />}

            {activeTab === "performance" && <TechnicianPerformanceComponent />}

            {activeTab === "heatmap" && <HeatmapComponent />}

            {activeTab === "predictions" && <PredictiveAlerts />}

            {activeTab === "users" && (
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage access and roles for the system.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-border overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                        <tr>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[
                          { name: "Admin User", email: "admin@campus.com", role: "Administrator", status: "Active" },
                          { name: "John Doe", email: "john@student.edu", role: "Student", status: "Active" },
                          { name: "Jane Smith", email: "jane@staff.edu", role: "Staff", status: "Active" },
                          { name: "Mike Tech", email: "mike@tech.com", role: "Technician", status: "Busy" },
                        ].map((user, i) => (
                          <tr key={i} className="hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium text-foreground">{user.name}</div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">{user.role}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  user.status === "Active"
                                    ? "bg-green-500/10 text-green-500"
                                    : "bg-yellow-500/10 text-yellow-500"
                                }`}
                              >
                                {user.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <UserActionsMenu user={user} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "settings" && (
              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>Configure global system parameters.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h3 className="font-medium text-foreground">Maintenance Mode</h3>
                        <p className="text-sm text-muted-foreground">Disable new incident reports temporarily.</p>
                      </div>
                      <div className="h-6 w-11 bg-muted rounded-full relative cursor-pointer transition-colors hover:bg-muted/80">
                        <div className="absolute left-1 top-1 h-4 w-4 bg-background rounded-full shadow-sm transition-transform" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h3 className="font-medium text-foreground">Auto-Assignment</h3>
                        <p className="text-sm text-muted-foreground">Automatically assign technicians based on load.</p>
                      </div>
                      <div className="h-6 w-11 bg-blue-600 rounded-full relative cursor-pointer transition-colors">
                        <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full shadow-sm transition-transform" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h3 className="font-medium text-foreground">Email Notifications</h3>
                        <p className="text-sm text-muted-foreground">Send email alerts for high priority incidents.</p>
                      </div>
                      <div className="h-6 w-11 bg-blue-600 rounded-full relative cursor-pointer transition-colors">
                        <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full shadow-sm transition-transform" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// User Actions Menu Component
function UserActionsMenu({ user }: { user: { name: string; email: string; role: string; status: string } }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEdit = () => {
    setIsOpen(false)
    // TODO: Implement edit user functionality
    alert(`Edit user: ${user.name}`)
  }

  const handleChangeRole = () => {
    setIsOpen(false)
    // TODO: Implement change role functionality
    alert(`Change role for: ${user.name}`)
  }

  const handleToggleStatus = () => {
    setIsOpen(false)
    // TODO: Implement toggle status functionality
    const newStatus = user.status === "Active" ? "Inactive" : "Active"
    alert(`Change status for ${user.name} to ${newStatus}`)
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      return
    }
    
    setIsOpen(false)
    setIsDeleting(true)
    
    try {
      // TODO: Implement delete user API call
      // await fetch(`/api/users/${user.email}`, { method: "DELETE" })
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      alert(`User ${user.name} has been deleted`)
      // Refresh the page or update the user list
      window.location.reload()
    } catch (error) {
      console.error("Error deleting user:", error)
      alert("Failed to delete user. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSendEmail = () => {
    setIsOpen(false)
    window.location.href = `mailto:${user.email}`
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDeleting}
      >
        <span className="sr-only">Open menu</span>
        <MoreVertical className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-[101]">
            <Card className="w-48 shadow-xl border border-border bg-background">
              <div className="p-1">
                <button
                  onClick={handleEdit}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Edit User
                </button>
                <button
                  onClick={handleChangeRole}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  <UserCog className="h-4 w-4" />
                  Change Role
                </button>
                <button
                  onClick={handleToggleStatus}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  {user.status === "Active" ? (
                    <>
                      <Ban className="h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Activate
                    </>
                  )}
                </button>
                <button
                  onClick={handleSendEmail}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  Send Email
                </button>
                <div className="border-t border-border my-1" />
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete User"}
                </button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

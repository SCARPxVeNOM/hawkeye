"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import IncidentForm from "@/components/incident-form"
import IncidentList from "@/components/incident-list"
import AnalyticsOverview from "@/components/analytics-overview"
import { LayoutDashboard, FileText, PlusCircle, Activity, LogOut, Bell } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [successMessage, setSuccessMessage] = useState("")

  const handleIncidentSuccess = () => {
    setSuccessMessage("Incident reported successfully!")
    setTimeout(() => setSuccessMessage(""), 3000)
    setActiveTab("incidents")
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header with Gradient */}
      <header className="bg-primary text-primary-foreground shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-secondary/30 opacity-50"></div>
        <div className="max-w-7xl mx-auto px-6 py-6 relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
              <Activity className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Campus Complaint System</h1>
              <p className="text-sm text-primary-foreground/70">Student & Staff Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10 rounded-full">
              <Bell className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              className="shadow-md hover:shadow-lg transition-all duration-300"
              onClick={() => {
                localStorage.clear()
                router.push("/")
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 -mt-8 relative z-20">
        {/* Navigation Tabs */}
        <Card className="mb-8 p-2 shadow-md border-none bg-card/80 backdrop-blur-sm sticky top-4 z-30">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "incidents", label: "My Incidents", icon: FileText },
              { id: "report", label: "Report Issue", icon: PlusCircle },
              { id: "tracking", label: "Issue Tracking", icon: Activity },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-md transform scale-[1.02]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Success Message Toast */}
        {successMessage && (
          <div className="mb-6 p-4 bg-secondary/10 border border-secondary/20 text-secondary-foreground rounded-xl flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
            <div className="h-2 w-2 rounded-full bg-secondary animate-pulse"></div>
            {successMessage}
          </div>
        )}

        {/* Tab Content with Animation */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === "overview" && <AnalyticsOverview />}

          {activeTab === "incidents" && <IncidentList userOnly={true} />}

          {activeTab === "report" && (
            <div className="flex justify-center">
              <IncidentForm onSuccess={handleIncidentSuccess} />
            </div>
          )}

          {activeTab === "tracking" && (
            <Card className="p-8 shadow-lg border-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">Issue Tracking</h2>
                <span className="text-sm text-muted-foreground">Real-time updates</span>
              </div>
              <div className="space-y-4">
                <div className="group flex items-center justify-between p-5 bg-muted/30 border border-border rounded-xl hover:bg-muted/50 transition-all duration-300 hover:shadow-md hover:border-secondary/30 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                      💧
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-lg">Water Leakage - Room 201</p>
                      <p className="text-sm text-muted-foreground">Updated 2 hours ago</p>
                    </div>
                  </div>
                  <span className="px-4 py-1.5 bg-secondary/10 text-secondary text-sm rounded-full font-semibold border border-secondary/20">
                    In Progress
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

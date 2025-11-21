"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-primary">Campus Complaint</h1>
            <h2 className="text-3xl font-bold text-primary">Management System</h2>
            <p className="text-muted-foreground mt-2">Report issues and track resolutions in real-time</p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => router.push("/auth/login")}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              Sign In
            </Button>
            <Button onClick={() => router.push("/auth/register")} variant="outline" className="w-full" size="lg">
              Create Account
            </Button>
          </div>

          <div className="pt-4 border-t border-border space-y-2">
            <p className="text-xs text-muted-foreground text-center">Staff Access</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => router.push("/admin/login")}
                variant="ghost"
                className="w-full text-secondary"
                size="sm"
              >
                Admin
              </Button>
              <Button
                onClick={() => router.push("/technician/login")}
                variant="ghost"
                className="w-full text-secondary"
                size="sm"
              >
                Technician
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return Response.json({ error: "Missing credentials" }, { status: 400 })
    }

    // Hardcoded admin credentials
    if (email === "admin@campus.com" && password === "admin123") {
      return Response.json({
        id: "admin-hardcoded",
        name: "Admin",
        email: "admin@campus.com",
        role: "admin",
      })
    }

    return Response.json({ error: "Invalid admin credentials" }, { status: 401 })
  } catch (error: any) {
    console.error("Admin login error:", error)
    return Response.json(
      { error: error.message || "An error occurred during login" },
      { status: 500 }
    )
  }
}


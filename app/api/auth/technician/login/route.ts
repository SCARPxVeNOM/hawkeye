export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return Response.json({ error: "Missing credentials" }, { status: 400 })
    }

    // Hardcoded technician credentials
    if (email === "techayush@gmail.com" && password === "ayush123") {
      return Response.json({
        id: "technician-hardcoded",
        name: "Ayush",
        email: "techayush@gmail.com",
        role: "technician",
        specialization: "General",
      })
    }

    return Response.json({ error: "Invalid technician credentials" }, { status: 401 })
  } catch (error: any) {
    console.error("Technician login error:", error)
    return Response.json(
      { error: error.message || "An error occurred during login" },
      { status: 500 }
    )
  }
}


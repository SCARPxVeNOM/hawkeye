import { compare } from "bcryptjs"
import { getDb } from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return Response.json({ error: "Missing credentials" }, { status: 400 })
    }

    const db = await getDb()
    const usersCollection = db.collection("users")

    const user = await usersCollection.findOne({ email, role: "technician" })
    if (!user) {
      return Response.json({ error: "Invalid technician credentials" }, { status: 401 })
    }

    if (!user.password_hash) {
      return Response.json(
        { error: "This account was created with Google. Please sign in with Google." },
        { status: 401 }
      )
    }

    const isValid = await compare(password, user.password_hash)
    if (!isValid) {
      return Response.json({ error: "Invalid technician credentials" }, { status: 401 })
    }

    return Response.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      specialization: user.specialization || "General",
    })
  } catch (error: any) {
    console.error("Technician login error:", error)
    
    // Provide more user-friendly error messages
    if (error.message?.includes("SSL") || error.message?.includes("TLS") || error.message?.includes("tlsv1")) {
      return Response.json(
        { error: "Database connection error. Please check your network connection and try again." },
        { status: 503 }
      )
    }
    
    if (error.message?.includes("MongoServerSelectionError") || error.message?.includes("MongoNetworkError")) {
      return Response.json(
        { error: "Unable to connect to database. Please try again later." },
        { status: 503 }
      )
    }
    
    return Response.json(
      { error: "An error occurred during login. Please try again." },
      { status: 500 }
    )
  }
}


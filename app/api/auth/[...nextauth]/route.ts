import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { getDb } from "@/lib/mongodb"
import { hash } from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Add timeout to MongoDB operations
          const dbPromise = getDb()
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('MongoDB connection timeout')), 5000)
          )
          
          const db = await Promise.race([dbPromise, timeoutPromise]) as any
          const usersCollection = db.collection("users")

          // Check if user exists by email
          const existingUser = await usersCollection.findOne({
            email: user.email,
          })

          if (existingUser) {
            // Update existing user with Google ID and avatar if not already set, or update avatar if it changed
            const updateData: any = {
              updated_at: new Date(),
            }
            
            if (!existingUser.googleId && account?.providerAccountId) {
              updateData.googleId = account.providerAccountId
              updateData.provider = "google"
            }
            
            // Always update avatar from Google (in case user changed their profile picture)
            if (user.image) {
              updateData.avatar = user.image
            }
            
            await usersCollection.updateOne(
              { email: user.email },
              { $set: updateData }
            )
          } else {
            // Create new user from Google account
            const newUser = {
              name: user.name || "",
              email: user.email || "",
              googleId: account?.providerAccountId || user.id || "",
              provider: "google",
              avatar: user.image || null,
              password_hash: null, // No password for OAuth users
              role: "user",
              created_at: new Date(),
              updated_at: new Date(),
            }

            await usersCollection.insertOne(newUser)
          }

          return true
        } catch (error) {
          console.error("Error in signIn callback:", error)
          console.error("MongoDB connection failed - this might be a Network Access issue in MongoDB Atlas")
          // For demo purposes, allow sign-in even if DB fails (NOT RECOMMENDED FOR PRODUCTION)
          // return false
          return true // TEMPORARY: Allow OAuth sign-in without DB
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user && account) {
        try {
          const db = await getDb()
          const usersCollection = db.collection("users")

          const dbUser = await usersCollection.findOne({
            $or: [
              { email: user.email },
              { googleId: account?.providerAccountId || user.id },
            ],
          })

          if (dbUser) {
            token.id = dbUser._id.toString()
            token.role = dbUser.role
            token.email = dbUser.email
            token.name = dbUser.name
            token.avatar = dbUser.avatar || null
          }
        } catch (error) {
          console.error("Error in jwt callback:", error)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.image = token.avatar as string
        session.user.avatar = token.avatar as string
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug mode to see errors in Vercel logs
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }


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
          const db = await getDb()
          const usersCollection = db.collection("users")

          // Check if user exists by email
          const existingUser = await usersCollection.findOne({
            email: user.email,
          })

          if (existingUser) {
            // Update existing user with Google ID if not already set
            if (!existingUser.googleId && account?.providerAccountId) {
              await usersCollection.updateOne(
                { email: user.email },
                {
                  $set: {
                    googleId: account.providerAccountId,
                    provider: "google",
                    avatar: user.image,
                    updated_at: new Date(),
                  },
                }
              )
            }
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
          return false
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
  debug: process.env.NODE_ENV === "development",
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }


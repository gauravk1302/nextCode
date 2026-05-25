import NextAuth from "next-auth"
import NeonAdapter from "@auth/neon-adapter"
import { Pool } from "@neondatabase/serverless"
import authConfig from "./auth.config"
import { sql } from "./lib/db"

export const { handlers, signIn, signOut, auth } = NextAuth(() => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  return {
    ...authConfig,
    adapter: NeonAdapter(pool),
    session: { strategy: "jwt" },
    secret: process.env.AUTH_SECRET,
    callbacks: {
      async jwt({ token, user }) {
        if (!token.sub) return token

        // Neon se user fetch karo
        const existingUser = await sql`
          SELECT * FROM users WHERE id = ${token.sub} LIMIT 1
        `

        if (!existingUser[0]) return token

        token.name = existingUser[0].name
        token.email = existingUser[0].email
        token.role = existingUser[0].role

        return token
      },

      async session({ session, token }) {
        if (token.sub && session.user) {
          session.user.id = token.sub
        }

        if (token.role && session.user) {
          session.user.role = token.role as string
        }

        return session
      },
    },
  }
})
"use server";

import { auth } from "@/auth";
import { sql } from "@/lib/db";

export const getUserById = async (id: string) => {
  try {
    const user = await sql`
      SELECT users.*, json_agg(accounts.*) as accounts
      FROM users
      LEFT JOIN accounts ON accounts."userId" = users.id
      WHERE users.id = ${id}
      GROUP BY users.id
      LIMIT 1
    `
    return user[0] || null
  } catch (error) {
    console.log(error)
    return null
  }
}

export const getAccountByUserId = async (userId: string) => {
  try {
    const account = await sql`
      SELECT * FROM accounts
      WHERE "userId" = ${userId}
      LIMIT 1
    `
    return account[0] || null
  } catch (error) {
    console.log(error)
    return null
  }
}

export const currentUser = async () => {
  const session = await auth();
  return session?.user;
}
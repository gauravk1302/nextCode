"use server";

import { sql } from "@/lib/db";
import { currentUser } from "@/modules/auth/actions";
import { revalidatePath } from "next/cache";

export const toggleStarMarked = async (
  playgroundId: string,
  isChecked: boolean
) => {
  const user = await currentUser();
  const userId = user?.id;
  if (!userId) {
    throw new Error("User Id is Required");
  }

  try {
    if (isChecked) {
      await sql`
        INSERT INTO star_marks ("userId", "playgroundId", "isMarked")
        VALUES (${userId}, ${playgroundId}, ${isChecked})
        ON CONFLICT ("userId", "playgroundId") DO UPDATE SET "isMarked" = ${isChecked}
      `;
    } else {
      await sql`
        DELETE FROM star_marks
        WHERE "userId" = ${userId} AND "playgroundId" = ${playgroundId}
      `;
    }

    revalidatePath("/dashboard");
    return { success: true, isMarked: isChecked };
  } catch (error) {
    console.error("Error updating problem:", error);
    return { success: false, error: "Failed to update problem" };
  }
};

export const getAllPlaygroundForUser = async () => {
  const user = await currentUser();
  // console.log("Current User ID:", user?.id);
  try {
    const playgrounds = await sql`
      SELECT 
        p.*,
        row_to_json(u.*) as user,
        sm."isMarked"
      FROM playgrounds p
      LEFT JOIN users u ON u.id = p."userId"
      LEFT JOIN star_marks sm ON sm."playgroundId" = p.id AND sm."userId" = ${user?.id}
      WHERE p."userId" = ${user?.id}
    `;

    return playgrounds;
    
  } catch (error) {
    console.log(error);
  }
};

export const createPlayground = async (data: {
  title: string;
  template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
  description?: string;
}) => {
  const user = await currentUser();
  const { template, title, description } = data;

  try {
    const playground = await sql`
      INSERT INTO playgrounds (title, description, template, "userId")
      VALUES (${title}, ${description ?? null}, ${template}, ${user?.id})
      RETURNING *
    `;

    return playground[0];
  } catch (error) {
    console.log(error);
  }
};

export const deleteProjectById = async (id: string) => {
  try {
    await sql`
      DELETE FROM playgrounds WHERE id = ${id}
    `;
    revalidatePath("/dashboard");
  } catch (error) {
    console.log(error);
  }
};

export const editProjectById = async (
  id: string,
  data: { title: string; description: string }
) => {
  try {
    await sql`
      UPDATE playgrounds
      SET title = ${data.title}, description = ${data.description}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    revalidatePath("/dashboard");
  } catch (error) {
    console.log(error);
  }
};

export const duplicateProjectById = async (id: string) => {
  try {
    const original = await sql`
      SELECT * FROM playgrounds WHERE id = ${id} LIMIT 1
    `;

    if (!original[0]) {
      throw new Error("Original playground not found");
    }

    const p = original[0];

    const duplicated = await sql`
      INSERT INTO playgrounds (title, description, template, "userId")
      VALUES (${p.title + " (Copy)"}, ${p.description}, ${p.template}, ${p.userId})
      RETURNING *
    `;

    revalidatePath("/dashboard");
    return duplicated[0];
  } catch (error) {
    console.error("Error duplicating project:", error);
  }
};
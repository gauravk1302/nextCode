"use server";

import { sql } from "@/lib/db";
import { currentUser } from "@/modules/auth/actions";
import { TemplateFolder } from "../lib/path-to-json";

export const getPlaygroundById = async (id: string) => {
  try {
    const result = await sql`
      SELECT
        p.id,
        p.title,
        tf.content::text AS content
      FROM playgrounds p
      LEFT JOIN template_files tf
        ON tf."playgroundId" = p.id
      WHERE p.id = ${id}
      LIMIT 1
    `;

    if (!result.length) return null;

    return {
      id: result[0].id,
      title: result[0].title,
      content: result[0].content,
    };
  } catch (error) {
    console.error("getPlaygroundById error:", error);
    return null;
  }
};

export const saveUpdatedCode = async (
  playgroundId: string,
  data: TemplateFolder
) => {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  try {
    const result = await sql`
      INSERT INTO template_files ("playgroundId", content)
      VALUES (${playgroundId}, ${JSON.stringify(data)}::jsonb)
      ON CONFLICT ("playgroundId")
      DO UPDATE SET
        content = EXCLUDED.content,
        "updatedAt" = NOW()
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error("saveUpdatedCode error:", error);
    return null;
  }
};
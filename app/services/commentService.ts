import { eq, desc } from "drizzle-orm";
import { db } from "~/db";
import { lessonComments, users } from "~/db/schema";

// ─── Comment Service ───

export function getCommentsForLesson(lessonId: number) {
  return db
    .select({
      id: lessonComments.id,
      userId: lessonComments.userId,
      lessonId: lessonComments.lessonId,
      body: lessonComments.body,
      createdAt: lessonComments.createdAt,
      updatedAt: lessonComments.updatedAt,
      userName: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(lessonComments)
    .innerJoin(users, eq(lessonComments.userId, users.id))
    .where(eq(lessonComments.lessonId, lessonId))
    .orderBy(desc(lessonComments.createdAt))
    .all();
}

export function createComment(userId: number, lessonId: number, body: string) {
  return db
    .insert(lessonComments)
    .values({ userId, lessonId, body })
    .returning()
    .get();
}

export function getCommentById(commentId: number) {
  return db
    .select()
    .from(lessonComments)
    .where(eq(lessonComments.id, commentId))
    .get();
}

export function updateComment(commentId: number, body: string) {
  return db
    .update(lessonComments)
    .set({ body, updatedAt: new Date().toISOString() })
    .where(eq(lessonComments.id, commentId))
    .returning()
    .get();
}

export function deleteComment(commentId: number) {
  db.delete(lessonComments).where(eq(lessonComments.id, commentId)).run();
}
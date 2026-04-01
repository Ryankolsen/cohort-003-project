import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "~/db";
import { courseRatings } from "~/db/schema";

export function getUserRatingForCourse(userId: number, courseId: number): number | null {
  const row = db
    .select({ rating: courseRatings.rating })
    .from(courseRatings)
    .where(and(eq(courseRatings.userId, userId), eq(courseRatings.courseId, courseId)))
    .get();
  return row?.rating ?? null;
}

export function getCourseRatingStats(courseId: number): { averageRating: number | null; ratingCount: number } {
  const row = db
    .select({
      averageRating: sql<number | null>`avg(${courseRatings.rating})`,
      ratingCount: sql<number>`count(*)`,
    })
    .from(courseRatings)
    .where(eq(courseRatings.courseId, courseId))
    .get();

  return {
    averageRating: row?.averageRating ?? null,
    ratingCount: row?.ratingCount ?? 0,
  };
}

export function getRatingStatsForCourses(courseIds: number[]): Map<number, { averageRating: number | null; ratingCount: number }> {
  const result = new Map<number, { averageRating: number | null; ratingCount: number }>();

  if (courseIds.length === 0) return result;

  const rows = db
    .select({
      courseId: courseRatings.courseId,
      averageRating: sql<number | null>`avg(${courseRatings.rating})`,
      ratingCount: sql<number>`count(*)`,
    })
    .from(courseRatings)
    .where(inArray(courseRatings.courseId, courseIds))
    .groupBy(courseRatings.courseId)
    .all();

  for (const row of rows) {
    result.set(row.courseId, {
      averageRating: row.averageRating,
      ratingCount: row.ratingCount,
    });
  }

  return result;
}

export function upsertCourseRating(userId: number, courseId: number, rating: number) {
  const existing = db
    .select()
    .from(courseRatings)
    .where(and(eq(courseRatings.userId, userId), eq(courseRatings.courseId, courseId)))
    .get();

  if (existing) {
    return db
      .update(courseRatings)
      .set({ rating, updatedAt: new Date().toISOString() })
      .where(eq(courseRatings.id, existing.id))
      .returning()
      .get();
  }

  return db
    .insert(courseRatings)
    .values({ userId, courseId, rating })
    .returning()
    .get();
}

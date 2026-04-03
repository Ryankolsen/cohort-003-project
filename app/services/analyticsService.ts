import { eq, and, isNotNull, sql } from "drizzle-orm";
import { db } from "~/db";
import {
  purchases,
  enrollments,
  courseRatings,
} from "~/db/schema";

export function getRevenueTrend(opts: {
  courseId: number;
}): { month: string; total: number }[] {
  const { courseId } = opts;
  return db
    .select({
      month: sql<string>`strftime('%Y-%m', ${purchases.createdAt})`,
      total: sql<number>`sum(${purchases.pricePaid})`,
    })
    .from(purchases)
    .where(eq(purchases.courseId, courseId))
    .groupBy(sql`strftime('%Y-%m', ${purchases.createdAt})`)
    .orderBy(sql`strftime('%Y-%m', ${purchases.createdAt})`)
    .all();
}

export function getEnrollmentTrend(opts: {
  courseId: number;
}): { month: string; count: number }[] {
  const { courseId } = opts;
  return db
    .select({
      month: sql<string>`strftime('%Y-%m', ${enrollments.enrolledAt})`,
      count: sql<number>`count(*)`,
    })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId))
    .groupBy(sql`strftime('%Y-%m', ${enrollments.enrolledAt})`)
    .orderBy(sql`strftime('%Y-%m', ${enrollments.enrolledAt})`)
    .all();
}

export function getCompletionRate(opts: {
  courseId: number;
}): { completed: number; total: number; rate: number } {
  const { courseId } = opts;

  const totalResult = db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId))
    .get();

  const total = totalResult?.count ?? 0;

  const completedResult = db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.courseId, courseId),
        isNotNull(enrollments.completedAt)
      )
    )
    .get();

  const completed = completedResult?.count ?? 0;
  const rate = total > 0 ? (completed / total) * 100 : 0;

  return { completed, total, rate };
}

export function getAverageRating(opts: {
  courseId: number;
}): { average: number; count: number } {
  const { courseId } = opts;

  const result = db
    .select({
      average: sql<number>`coalesce(avg(${courseRatings.rating}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(courseRatings)
    .where(eq(courseRatings.courseId, courseId))
    .get();

  return {
    average: result?.average ?? 0,
    count: result?.count ?? 0,
  };
}

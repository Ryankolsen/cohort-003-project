import { eq, and, isNotNull, sql } from "drizzle-orm";
import { db } from "~/db";
import {
  purchases,
  enrollments,
  courseRatings,
  quizAttempts,
  quizzes,
  lessons,
  modules,
  lessonProgress,
  LessonProgressStatus,
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

export function getQuizPassRates(opts: { courseId: number }): {
  quizId: number;
  quizTitle: string;
  lessonTitle: string;
  modulePosition: number;
  lessonPosition: number;
  passed: number;
  total: number;
  passRate: number;
}[] {
  const { courseId } = opts;

  const rows = db
    .select({
      quizId: quizAttempts.quizId,
      quizTitle: quizzes.title,
      lessonTitle: lessons.title,
      modulePosition: modules.position,
      lessonPosition: lessons.position,
      passed: sql<number>`sum(case when ${quizAttempts.passed} then 1 else 0 end)`,
      total: sql<number>`count(*)`,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
    .innerJoin(lessons, eq(quizzes.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(eq(modules.courseId, courseId))
    .groupBy(quizAttempts.quizId)
    .orderBy(modules.position, lessons.position)
    .all();

  return rows.map((row) => ({
    ...row,
    passRate: row.total > 0 ? (row.passed / row.total) * 100 : 0,
  }));
}

export function getDropOffFunnel(opts: { courseId: number }): {
  lessonId: number;
  lessonTitle: string;
  moduleTitle: string;
  modulePosition: number;
  lessonPosition: number;
  completedCount: number;
  enrolledCount: number;
  percentage: number;
}[] {
  const { courseId } = opts;

  const enrolledResult = db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId))
    .get();

  const enrolledCount = enrolledResult?.count ?? 0;

  const rows = db
    .select({
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      moduleTitle: modules.title,
      modulePosition: modules.position,
      lessonPosition: lessons.position,
      completedCount: sql<number>`count(${lessonProgress.id})`,
    })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .leftJoin(
      lessonProgress,
      and(
        eq(lessonProgress.lessonId, lessons.id),
        eq(lessonProgress.status, LessonProgressStatus.Completed)
      )
    )
    .where(eq(modules.courseId, courseId))
    .groupBy(lessons.id)
    .orderBy(modules.position, lessons.position)
    .all();

  return rows.map((row) => ({
    ...row,
    enrolledCount,
    percentage: enrolledCount > 0 ? (row.completedCount / enrolledCount) * 100 : 0,
  }));
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

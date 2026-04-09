import { eq, sql } from "drizzle-orm";
import { db } from "~/db";
import { purchases, enrollments, courses, users } from "~/db/schema";

export type TimePeriod = "7d" | "30d" | "12m" | "all";

function getPeriodCutoff(period: TimePeriod): string | null {
  if (period === "all") return null;
  const now = new Date();
  if (period === "7d") now.setDate(now.getDate() - 7);
  else if (period === "30d") now.setDate(now.getDate() - 30);
  else if (period === "12m") now.setMonth(now.getMonth() - 12);
  return now.toISOString();
}

export function getAdminTotalRevenue(opts: { period: TimePeriod }): number {
  const cutoff = getPeriodCutoff(opts.period);

  const result = db
    .select({
      total: sql<number>`coalesce(sum(${purchases.pricePaid}), 0)`,
    })
    .from(purchases)
    .where(cutoff ? sql`${purchases.createdAt} >= ${cutoff}` : undefined)
    .get();

  return result?.total ?? 0;
}

export function getAdminTotalEnrollments(opts: { period: TimePeriod }): number {
  const cutoff = getPeriodCutoff(opts.period);

  const result = db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(enrollments)
    .where(cutoff ? sql`${enrollments.enrolledAt} >= ${cutoff}` : undefined)
    .get();

  return result?.count ?? 0;
}

export function getAdminTopEarningCourse(opts: {
  period: TimePeriod;
}): { title: string; revenue: number } | null {
  const cutoff = getPeriodCutoff(opts.period);

  const result = db
    .select({
      title: courses.title,
      revenue: sql<number>`sum(${purchases.pricePaid})`,
    })
    .from(purchases)
    .innerJoin(courses, eq(purchases.courseId, courses.id))
    .where(cutoff ? sql`${purchases.createdAt} >= ${cutoff}` : undefined)
    .groupBy(purchases.courseId)
    .orderBy(sql`sum(${purchases.pricePaid}) desc`)
    .limit(1)
    .get();

  return result ?? null;
}

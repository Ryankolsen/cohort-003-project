import { eq, sql } from "drizzle-orm";
import { db } from "~/db";
import { purchases, enrollments, courses, users } from "~/db/schema";

export type TimePeriod = "7d" | "30d" | "12m" | "all";
export type RevenueDataPoint = { date: string; revenue: number };

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

function isDaily(period: TimePeriod): boolean {
  return period === "7d" || period === "30d";
}

function generateDateRange(opts: {
  period: TimePeriod;
  earliest: string | null;
}): string[] {
  const now = new Date();
  const dates: string[] = [];

  if (isDaily(opts.period)) {
    const days = opts.period === "7d" ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
  } else {
    const months = opts.period === "12m" ? 12 : null;
    let start: Date;

    if (months !== null) {
      start = new Date(now);
      start.setMonth(start.getMonth() - (months - 1));
      start.setDate(1);
    } else if (opts.earliest) {
      start = new Date(opts.earliest);
      start.setDate(1);
    } else {
      return [];
    }

    const cursor = new Date(start);
    while (
      cursor.getFullYear() < now.getFullYear() ||
      (cursor.getFullYear() === now.getFullYear() &&
        cursor.getMonth() <= now.getMonth())
    ) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      dates.push(`${y}-${m}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return dates;
}

export function getAdminRevenueOverTime(opts: {
  period: TimePeriod;
}): RevenueDataPoint[] {
  const { period } = opts;
  const cutoff = getPeriodCutoff(period);
  const fmt = isDaily(period) ? "%Y-%m-%d" : "%Y-%m";

  const rows = db
    .select({
      date: sql<string>`strftime('${sql.raw(fmt)}', ${purchases.createdAt})`,
      revenue: sql<number>`sum(${purchases.pricePaid})`,
    })
    .from(purchases)
    .where(cutoff ? sql`${purchases.createdAt} >= ${cutoff}` : undefined)
    .groupBy(sql`strftime('${sql.raw(fmt)}', ${purchases.createdAt})`)
    .orderBy(sql`strftime('${sql.raw(fmt)}', ${purchases.createdAt})`)
    .all();

  const revenueMap = new Map(rows.map((r) => [r.date, r.revenue]));

  const earliest = rows.length > 0 ? rows[0].date : null;
  const allDates = generateDateRange({ period, earliest });

  return allDates.map((date) => ({
    date,
    revenue: revenueMap.get(date) ?? 0,
  }));
}

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

import {
  getAdminTotalRevenue,
  getAdminTotalEnrollments,
  getAdminTopEarningCourse,
} from "./adminAnalyticsService";

function seedPurchase(
  testDb: ReturnType<typeof createTestDb>,
  opts: {
    userId: number;
    courseId: number;
    pricePaid: number;
    createdAt?: string;
  }
) {
  return testDb
    .insert(schema.purchases)
    .values({
      userId: opts.userId,
      courseId: opts.courseId,
      pricePaid: opts.pricePaid,
      ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
    })
    .returning()
    .get();
}

function seedEnrollment(
  testDb: ReturnType<typeof createTestDb>,
  opts: {
    userId: number;
    courseId: number;
    enrolledAt?: string;
  }
) {
  return testDb
    .insert(schema.enrollments)
    .values({
      userId: opts.userId,
      courseId: opts.courseId,
      ...(opts.enrolledAt ? { enrolledAt: opts.enrolledAt } : {}),
    })
    .returning()
    .get();
}

describe("adminAnalyticsService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("getAdminTotalRevenue", () => {
    it("returns 0 when there are no purchases", () => {
      const result = getAdminTotalRevenue({ period: "all" });

      expect(result).toBe(0);
    });

    it("sums revenue across all courses", () => {
      const course2 = testDb
        .insert(schema.courses)
        .values({
          title: "Course 2",
          slug: "course-2",
          description: "Another course",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      seedPurchase(testDb, {
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 4900,
      });
      seedPurchase(testDb, {
        userId: base.user.id,
        courseId: course2.id,
        pricePaid: 2900,
      });

      const result = getAdminTotalRevenue({ period: "all" });

      expect(result).toBe(7800);
    });

    it("filters by time period", () => {
      seedPurchase(testDb, {
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 4900,
        createdAt: new Date().toISOString(),
      });
      seedPurchase(testDb, {
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 2900,
        createdAt: "2020-01-01T00:00:00.000Z",
      });

      const result = getAdminTotalRevenue({ period: "30d" });

      expect(result).toBe(4900);
    });
  });

  describe("getAdminTotalEnrollments", () => {
    it("returns 0 when there are no enrollments", () => {
      const result = getAdminTotalEnrollments({ period: "all" });

      expect(result).toBe(0);
    });

    it("counts enrollments across all courses", () => {
      const user2 = testDb
        .insert(schema.users)
        .values({ name: "User 2", email: "u2@example.com", role: schema.UserRole.Student })
        .returning()
        .get();

      const course2 = testDb
        .insert(schema.courses)
        .values({
          title: "Course 2",
          slug: "course-2",
          description: "Another course",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      seedEnrollment(testDb, { userId: base.user.id, courseId: base.course.id });
      seedEnrollment(testDb, { userId: user2.id, courseId: course2.id });

      const result = getAdminTotalEnrollments({ period: "all" });

      expect(result).toBe(2);
    });

    it("filters by time period", () => {
      seedEnrollment(testDb, {
        userId: base.user.id,
        courseId: base.course.id,
        enrolledAt: new Date().toISOString(),
      });

      const user2 = testDb
        .insert(schema.users)
        .values({ name: "User 2", email: "u2@example.com", role: schema.UserRole.Student })
        .returning()
        .get();

      seedEnrollment(testDb, {
        userId: user2.id,
        courseId: base.course.id,
        enrolledAt: "2020-01-01T00:00:00.000Z",
      });

      const result = getAdminTotalEnrollments({ period: "30d" });

      expect(result).toBe(1);
    });
  });

  describe("getAdminTopEarningCourse", () => {
    it("returns null when there are no purchases", () => {
      const result = getAdminTopEarningCourse({ period: "all" });

      expect(result).toBeNull();
    });

    it("returns the course with the highest revenue", () => {
      const course2 = testDb
        .insert(schema.courses)
        .values({
          title: "Course 2",
          slug: "course-2",
          description: "Another course",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      seedPurchase(testDb, {
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 4900,
      });
      seedPurchase(testDb, {
        userId: base.user.id,
        courseId: course2.id,
        pricePaid: 9900,
      });

      const result = getAdminTopEarningCourse({ period: "all" });

      expect(result).toEqual({ title: "Course 2", revenue: 9900 });
    });

    it("filters by time period", () => {
      const course2 = testDb
        .insert(schema.courses)
        .values({
          title: "Course 2",
          slug: "course-2",
          description: "Another course",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      // course2 has more revenue overall but only old purchases
      seedPurchase(testDb, {
        userId: base.user.id,
        courseId: course2.id,
        pricePaid: 9900,
        createdAt: "2020-01-01T00:00:00.000Z",
      });
      // base.course has a recent purchase
      seedPurchase(testDb, {
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 4900,
        createdAt: new Date().toISOString(),
      });

      const result = getAdminTopEarningCourse({ period: "30d" });

      expect(result).toEqual({ title: "Test Course", revenue: 4900 });
    });
  });
});

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

// Import after mock so the module picks up our test db
import {
  getRevenueTrend,
  getEnrollmentTrend,
  getCompletionRate,
  getAverageRating,
  getQuizPassRates,
  getDropOffFunnel,
} from "./analyticsService";

function seedModule(
  testDb: ReturnType<typeof createTestDb>,
  courseId: number,
  position = 1
) {
  return testDb
    .insert(schema.modules)
    .values({ courseId, title: "Module 1", position })
    .returning()
    .get();
}

function seedLesson(
  testDb: ReturnType<typeof createTestDb>,
  moduleId: number,
  position = 1
) {
  return testDb
    .insert(schema.lessons)
    .values({ moduleId, title: "Lesson 1", position })
    .returning()
    .get();
}

function seedPurchase(
  testDb: ReturnType<typeof createTestDb>,
  opts: { userId: number; courseId: number; pricePaid: number; createdAt?: string }
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
  opts: { userId: number; courseId: number; enrolledAt?: string; completedAt?: string }
) {
  return testDb
    .insert(schema.enrollments)
    .values({
      userId: opts.userId,
      courseId: opts.courseId,
      ...(opts.enrolledAt ? { enrolledAt: opts.enrolledAt } : {}),
      ...(opts.completedAt ? { completedAt: opts.completedAt } : {}),
    })
    .returning()
    .get();
}

function seedQuiz(
  testDb: ReturnType<typeof createTestDb>,
  opts: { lessonId: number; title?: string; passingScore?: number }
) {
  return testDb
    .insert(schema.quizzes)
    .values({
      lessonId: opts.lessonId,
      title: opts.title ?? "Quiz",
      passingScore: opts.passingScore ?? 0.7,
    })
    .returning()
    .get();
}

function seedQuizAttempt(
  testDb: ReturnType<typeof createTestDb>,
  opts: { userId: number; quizId: number; score: number; passed: boolean }
) {
  return testDb
    .insert(schema.quizAttempts)
    .values(opts)
    .returning()
    .get();
}

function seedLessonProgress(
  testDb: ReturnType<typeof createTestDb>,
  opts: { userId: number; lessonId: number; status: schema.LessonProgressStatus }
) {
  return testDb
    .insert(schema.lessonProgress)
    .values(opts)
    .returning()
    .get();
}

function seedRating(
  testDb: ReturnType<typeof createTestDb>,
  opts: { userId: number; courseId: number; rating: number }
) {
  return testDb
    .insert(schema.courseRatings)
    .values(opts)
    .returning()
    .get();
}

describe("analyticsService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("getRevenueTrend", () => {
    it("returns an empty array when there are no purchases", () => {
      const result = getRevenueTrend({ courseId: base.course.id });

      expect(result).toEqual([]);
    });

    it("returns monthly revenue grouped by calendar month", () => {
      seedPurchase(testDb, {
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 4900,
        createdAt: "2025-01-15T00:00:00.000Z",
      });
      seedPurchase(testDb, {
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 4900,
        createdAt: "2025-01-28T00:00:00.000Z",
      });
      seedPurchase(testDb, {
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 4900,
        createdAt: "2025-02-10T00:00:00.000Z",
      });

      const result = getRevenueTrend({ courseId: base.course.id });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ month: "2025-01", total: 9800 });
      expect(result[1]).toEqual({ month: "2025-02", total: 4900 });
    });

    it("returns months in ascending chronological order", () => {
      seedPurchase(testDb, {
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 1000,
        createdAt: "2025-03-01T00:00:00.000Z",
      });
      seedPurchase(testDb, {
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 1000,
        createdAt: "2025-01-01T00:00:00.000Z",
      });

      const result = getRevenueTrend({ courseId: base.course.id });

      expect(result[0].month).toBe("2025-01");
      expect(result[1].month).toBe("2025-03");
    });

    it("does not include purchases from other courses", () => {
      const otherCourse = testDb
        .insert(schema.courses)
        .values({
          title: "Other Course",
          slug: "other-course",
          description: "Another course",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      seedPurchase(testDb, {
        userId: base.user.id,
        courseId: otherCourse.id,
        pricePaid: 9900,
        createdAt: "2025-01-01T00:00:00.000Z",
      });

      const result = getRevenueTrend({ courseId: base.course.id });

      expect(result).toHaveLength(0);
    });
  });

  describe("getEnrollmentTrend", () => {
    it("returns an empty array when there are no enrollments", () => {
      const result = getEnrollmentTrend({ courseId: base.course.id });

      expect(result).toEqual([]);
    });

    it("returns monthly enrollment counts grouped by calendar month", () => {
      const user2 = testDb
        .insert(schema.users)
        .values({ name: "User 2", email: "user2@example.com", role: schema.UserRole.Student })
        .returning()
        .get();

      seedEnrollment(testDb, {
        userId: base.user.id,
        courseId: base.course.id,
        enrolledAt: "2025-01-10T00:00:00.000Z",
      });
      seedEnrollment(testDb, {
        userId: user2.id,
        courseId: base.course.id,
        enrolledAt: "2025-01-20T00:00:00.000Z",
      });

      const result = getEnrollmentTrend({ courseId: base.course.id });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ month: "2025-01", count: 2 });
    });

    it("returns months in ascending chronological order", () => {
      const user2 = testDb
        .insert(schema.users)
        .values({ name: "User 2", email: "user2@example.com", role: schema.UserRole.Student })
        .returning()
        .get();

      seedEnrollment(testDb, {
        userId: base.user.id,
        courseId: base.course.id,
        enrolledAt: "2025-03-01T00:00:00.000Z",
      });
      seedEnrollment(testDb, {
        userId: user2.id,
        courseId: base.course.id,
        enrolledAt: "2025-01-01T00:00:00.000Z",
      });

      const result = getEnrollmentTrend({ courseId: base.course.id });

      expect(result[0].month).toBe("2025-01");
      expect(result[1].month).toBe("2025-03");
    });

    it("does not include enrollments from other courses", () => {
      const otherCourse = testDb
        .insert(schema.courses)
        .values({
          title: "Other Course",
          slug: "other-course",
          description: "Another course",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      seedEnrollment(testDb, {
        userId: base.user.id,
        courseId: otherCourse.id,
        enrolledAt: "2025-01-01T00:00:00.000Z",
      });

      const result = getEnrollmentTrend({ courseId: base.course.id });

      expect(result).toHaveLength(0);
    });
  });

  describe("getCompletionRate", () => {
    it("returns zeros when there are no enrollments", () => {
      const result = getCompletionRate({ courseId: base.course.id });

      expect(result).toEqual({ completed: 0, total: 0, rate: 0 });
    });

    it("returns 0% rate when no students have completed", () => {
      seedEnrollment(testDb, {
        userId: base.user.id,
        courseId: base.course.id,
      });

      const result = getCompletionRate({ courseId: base.course.id });

      expect(result.total).toBe(1);
      expect(result.completed).toBe(0);
      expect(result.rate).toBe(0);
    });

    it("calculates the completion rate correctly", () => {
      const user2 = testDb
        .insert(schema.users)
        .values({ name: "User 2", email: "user2@example.com", role: schema.UserRole.Student })
        .returning()
        .get();
      const user3 = testDb
        .insert(schema.users)
        .values({ name: "User 3", email: "user3@example.com", role: schema.UserRole.Student })
        .returning()
        .get();
      const user4 = testDb
        .insert(schema.users)
        .values({ name: "User 4", email: "user4@example.com", role: schema.UserRole.Student })
        .returning()
        .get();

      seedEnrollment(testDb, { userId: base.user.id, courseId: base.course.id, completedAt: "2025-02-01T00:00:00.000Z" });
      seedEnrollment(testDb, { userId: user2.id, courseId: base.course.id, completedAt: "2025-02-15T00:00:00.000Z" });
      seedEnrollment(testDb, { userId: user3.id, courseId: base.course.id });
      seedEnrollment(testDb, { userId: user4.id, courseId: base.course.id });

      const result = getCompletionRate({ courseId: base.course.id });

      expect(result.total).toBe(4);
      expect(result.completed).toBe(2);
      expect(result.rate).toBe(50);
    });

    it("returns 100% when all enrolled students have completed", () => {
      seedEnrollment(testDb, {
        userId: base.user.id,
        courseId: base.course.id,
        completedAt: "2025-02-01T00:00:00.000Z",
      });

      const result = getCompletionRate({ courseId: base.course.id });

      expect(result.rate).toBe(100);
    });

    it("does not count completions from other courses", () => {
      const otherCourse = testDb
        .insert(schema.courses)
        .values({
          title: "Other Course",
          slug: "other-course",
          description: "Another course",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      seedEnrollment(testDb, { userId: base.user.id, courseId: base.course.id });
      seedEnrollment(testDb, {
        userId: base.user.id,
        courseId: otherCourse.id,
        completedAt: "2025-02-01T00:00:00.000Z",
      });

      const result = getCompletionRate({ courseId: base.course.id });

      expect(result.total).toBe(1);
      expect(result.completed).toBe(0);
    });
  });

  describe("getQuizPassRates", () => {
    it("returns an empty array when there are no quiz attempts", () => {
      const result = getQuizPassRates({ courseId: base.course.id });

      expect(result).toEqual([]);
    });

    it("calculates pass rate correctly across multiple attempts by multiple users", () => {
      const user2 = testDb
        .insert(schema.users)
        .values({ name: "User 2", email: "user2@example.com", role: schema.UserRole.Student })
        .returning()
        .get();

      const mod = seedModule(testDb, base.course.id, 1);
      const lesson = seedLesson(testDb, mod.id, 1);
      const quiz = seedQuiz(testDb, { lessonId: lesson.id, title: "Quiz 1" });

      seedQuizAttempt(testDb, { userId: base.user.id, quizId: quiz.id, score: 0.9, passed: true });
      seedQuizAttempt(testDb, { userId: user2.id, quizId: quiz.id, score: 0.4, passed: false });
      seedQuizAttempt(testDb, { userId: base.user.id, quizId: quiz.id, score: 0.5, passed: false });

      const result = getQuizPassRates({ courseId: base.course.id });

      expect(result).toHaveLength(1);
      expect(result[0].quizTitle).toBe("Quiz 1");
      expect(result[0].total).toBe(3);
      expect(result[0].passed).toBe(1);
      expect(result[0].passRate).toBeCloseTo(33.33);
    });

    it("returns quizzes in curriculum order (module position → lesson position)", () => {
      const mod1 = seedModule(testDb, base.course.id, 1);
      const mod2 = seedModule(testDb, base.course.id, 2);
      const lessonA = seedLesson(testDb, mod1.id, 2);
      const lessonB = seedLesson(testDb, mod1.id, 1);
      const lessonC = seedLesson(testDb, mod2.id, 1);

      const quizA = seedQuiz(testDb, { lessonId: lessonA.id, title: "Quiz A" });
      const quizB = seedQuiz(testDb, { lessonId: lessonB.id, title: "Quiz B" });
      const quizC = seedQuiz(testDb, { lessonId: lessonC.id, title: "Quiz C" });

      seedQuizAttempt(testDb, { userId: base.user.id, quizId: quizA.id, score: 1, passed: true });
      seedQuizAttempt(testDb, { userId: base.user.id, quizId: quizB.id, score: 1, passed: true });
      seedQuizAttempt(testDb, { userId: base.user.id, quizId: quizC.id, score: 1, passed: true });

      const result = getQuizPassRates({ courseId: base.course.id });

      expect(result).toHaveLength(3);
      expect(result[0].quizTitle).toBe("Quiz B"); // mod1, lesson pos 1
      expect(result[1].quizTitle).toBe("Quiz A"); // mod1, lesson pos 2
      expect(result[2].quizTitle).toBe("Quiz C"); // mod2, lesson pos 1
    });

    it("does not include quiz attempts from other courses", () => {
      const otherCourse = testDb
        .insert(schema.courses)
        .values({
          title: "Other Course",
          slug: "other-course",
          description: "Another course",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      const otherMod = seedModule(testDb, otherCourse.id, 1);
      const otherLesson = seedLesson(testDb, otherMod.id, 1);
      const otherQuiz = seedQuiz(testDb, { lessonId: otherLesson.id, title: "Other Quiz" });

      seedQuizAttempt(testDb, { userId: base.user.id, quizId: otherQuiz.id, score: 1, passed: true });

      const result = getQuizPassRates({ courseId: base.course.id });

      expect(result).toHaveLength(0);
    });
  });

  describe("getDropOffFunnel", () => {
    it("returns an empty array when there are no lessons", () => {
      const result = getDropOffFunnel({ courseId: base.course.id });

      expect(result).toEqual([]);
    });

    it("includes lessons with zero completions in the funnel", () => {
      const mod = seedModule(testDb, base.course.id, 1);
      seedLesson(testDb, mod.id, 1);
      seedLesson(testDb, mod.id, 2);

      seedEnrollment(testDb, { userId: base.user.id, courseId: base.course.id });

      const result = getDropOffFunnel({ courseId: base.course.id });

      expect(result).toHaveLength(2);
      expect(result[0].completedCount).toBe(0);
      expect(result[0].percentage).toBe(0);
      expect(result[1].completedCount).toBe(0);
    });

    it("calculates completion percentage correctly", () => {
      const user2 = testDb
        .insert(schema.users)
        .values({ name: "User 2", email: "user2@example.com", role: schema.UserRole.Student })
        .returning()
        .get();
      const user3 = testDb
        .insert(schema.users)
        .values({ name: "User 3", email: "user3@example.com", role: schema.UserRole.Student })
        .returning()
        .get();

      const mod = seedModule(testDb, base.course.id, 1);
      const lesson = seedLesson(testDb, mod.id, 1);

      seedEnrollment(testDb, { userId: base.user.id, courseId: base.course.id });
      seedEnrollment(testDb, { userId: user2.id, courseId: base.course.id });
      seedEnrollment(testDb, { userId: user3.id, courseId: base.course.id });

      seedLessonProgress(testDb, { userId: base.user.id, lessonId: lesson.id, status: schema.LessonProgressStatus.Completed });
      seedLessonProgress(testDb, { userId: user2.id, lessonId: lesson.id, status: schema.LessonProgressStatus.Completed });
      seedLessonProgress(testDb, { userId: user3.id, lessonId: lesson.id, status: schema.LessonProgressStatus.InProgress });

      const result = getDropOffFunnel({ courseId: base.course.id });

      expect(result).toHaveLength(1);
      expect(result[0].completedCount).toBe(2);
      expect(result[0].enrolledCount).toBe(3);
      expect(result[0].percentage).toBeCloseTo(66.67);
    });

    it("returns lessons in curriculum order (module position → lesson position)", () => {
      const mod1 = seedModule(testDb, base.course.id, 1);
      const mod2 = seedModule(testDb, base.course.id, 2);
      const lessonA = seedLesson(testDb, mod1.id, 2);
      const lessonB = seedLesson(testDb, mod1.id, 1);
      const lessonC = seedLesson(testDb, mod2.id, 1);

      const result = getDropOffFunnel({ courseId: base.course.id });

      expect(result).toHaveLength(3);
      expect(result[0].lessonId).toBe(lessonB.id); // mod1, pos 1
      expect(result[1].lessonId).toBe(lessonA.id); // mod1, pos 2
      expect(result[2].lessonId).toBe(lessonC.id); // mod2, pos 1
    });

    it("does not include lessons from other courses", () => {
      const otherCourse = testDb
        .insert(schema.courses)
        .values({
          title: "Other Course",
          slug: "other-course",
          description: "Another course",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      const otherMod = seedModule(testDb, otherCourse.id, 1);
      seedLesson(testDb, otherMod.id, 1);

      const result = getDropOffFunnel({ courseId: base.course.id });

      expect(result).toHaveLength(0);
    });

    it("returns 0% for all lessons when there are no enrollments", () => {
      const mod = seedModule(testDb, base.course.id, 1);
      seedLesson(testDb, mod.id, 1);

      const result = getDropOffFunnel({ courseId: base.course.id });

      expect(result).toHaveLength(1);
      expect(result[0].enrolledCount).toBe(0);
      expect(result[0].percentage).toBe(0);
    });
  });

  describe("getAverageRating", () => {
    it("returns zeros when there are no ratings", () => {
      const result = getAverageRating({ courseId: base.course.id });

      expect(result).toEqual({ average: 0, count: 0 });
    });

    it("returns the correct average and count for a single rating", () => {
      seedRating(testDb, { userId: base.user.id, courseId: base.course.id, rating: 4 });

      const result = getAverageRating({ courseId: base.course.id });

      expect(result.count).toBe(1);
      expect(result.average).toBe(4);
    });

    it("calculates the average across multiple ratings", () => {
      const user2 = testDb
        .insert(schema.users)
        .values({ name: "User 2", email: "user2@example.com", role: schema.UserRole.Student })
        .returning()
        .get();
      const user3 = testDb
        .insert(schema.users)
        .values({ name: "User 3", email: "user3@example.com", role: schema.UserRole.Student })
        .returning()
        .get();

      seedRating(testDb, { userId: base.user.id, courseId: base.course.id, rating: 5 });
      seedRating(testDb, { userId: user2.id, courseId: base.course.id, rating: 3 });
      seedRating(testDb, { userId: user3.id, courseId: base.course.id, rating: 4 });

      const result = getAverageRating({ courseId: base.course.id });

      expect(result.count).toBe(3);
      expect(result.average).toBeCloseTo(4);
    });

    it("does not include ratings from other courses", () => {
      const otherCourse = testDb
        .insert(schema.courses)
        .values({
          title: "Other Course",
          slug: "other-course",
          description: "Another course",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      seedRating(testDb, { userId: base.user.id, courseId: otherCourse.id, rating: 5 });

      const result = getAverageRating({ courseId: base.course.id });

      expect(result.count).toBe(0);
      expect(result.average).toBe(0);
    });
  });
});

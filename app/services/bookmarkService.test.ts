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
  toggleBookmark,
  isLessonBookmarked,
  getBookmarkedLessonIds,
} from "./bookmarkService";

function seedLesson(testDb: ReturnType<typeof createTestDb>, courseId: number) {
  const mod = testDb
    .insert(schema.modules)
    .values({ courseId, title: "Module 1", position: 1 })
    .returning()
    .get();

  const lesson = testDb
    .insert(schema.lessons)
    .values({ moduleId: mod.id, title: "Lesson 1", position: 1 })
    .returning()
    .get();

  return { mod, lesson };
}

describe("bookmarkService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("toggleBookmark", () => {
    it("creates a bookmark when none exists and returns bookmarked: true", () => {
      const { lesson } = seedLesson(testDb, base.course.id);

      const result = toggleBookmark({ userId: base.user.id, lessonId: lesson.id });

      expect(result.bookmarked).toBe(true);
    });

    it("removes a bookmark when one exists and returns bookmarked: false", () => {
      const { lesson } = seedLesson(testDb, base.course.id);

      toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
      const result = toggleBookmark({ userId: base.user.id, lessonId: lesson.id });

      expect(result.bookmarked).toBe(false);
    });

    it("toggling twice leaves no bookmark in the database", () => {
      const { lesson } = seedLesson(testDb, base.course.id);

      toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
      toggleBookmark({ userId: base.user.id, lessonId: lesson.id });

      expect(isLessonBookmarked({ userId: base.user.id, lessonId: lesson.id })).toBe(false);
    });

    it("bookmarks are scoped per user — one user's bookmark does not affect another", () => {
      const { lesson } = seedLesson(testDb, base.course.id);
      const otherUser = testDb
        .insert(schema.users)
        .values({ name: "Other", email: "other@example.com", role: schema.UserRole.Student })
        .returning()
        .get();

      toggleBookmark({ userId: base.user.id, lessonId: lesson.id });

      expect(isLessonBookmarked({ userId: otherUser.id, lessonId: lesson.id })).toBe(false);
    });
  });

  describe("isLessonBookmarked", () => {
    it("returns false when no bookmark exists", () => {
      const { lesson } = seedLesson(testDb, base.course.id);

      expect(isLessonBookmarked({ userId: base.user.id, lessonId: lesson.id })).toBe(false);
    });

    it("returns true after a bookmark is created", () => {
      const { lesson } = seedLesson(testDb, base.course.id);
      toggleBookmark({ userId: base.user.id, lessonId: lesson.id });

      expect(isLessonBookmarked({ userId: base.user.id, lessonId: lesson.id })).toBe(true);
    });

    it("returns false after a bookmark is removed", () => {
      const { lesson } = seedLesson(testDb, base.course.id);
      toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
      toggleBookmark({ userId: base.user.id, lessonId: lesson.id });

      expect(isLessonBookmarked({ userId: base.user.id, lessonId: lesson.id })).toBe(false);
    });
  });

  describe("getBookmarkedLessonIds", () => {
    it("returns an empty array when there are no bookmarks", () => {
      const ids = getBookmarkedLessonIds({ userId: base.user.id, courseId: base.course.id });

      expect(ids).toEqual([]);
    });

    it("returns bookmarked lesson IDs for the given course", () => {
      const { lesson } = seedLesson(testDb, base.course.id);
      toggleBookmark({ userId: base.user.id, lessonId: lesson.id });

      const ids = getBookmarkedLessonIds({ userId: base.user.id, courseId: base.course.id });

      expect(ids).toContain(lesson.id);
      expect(ids).toHaveLength(1);
    });

    it("does not return bookmarks from a different course", () => {
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

      const { lesson: lessonInOtherCourse } = seedLesson(testDb, otherCourse.id);
      toggleBookmark({ userId: base.user.id, lessonId: lessonInOtherCourse.id });

      const ids = getBookmarkedLessonIds({ userId: base.user.id, courseId: base.course.id });

      expect(ids).toHaveLength(0);
    });

    it("does not return bookmarks belonging to a different user", () => {
      const { lesson } = seedLesson(testDb, base.course.id);
      const otherUser = testDb
        .insert(schema.users)
        .values({ name: "Other", email: "other@example.com", role: schema.UserRole.Student })
        .returning()
        .get();

      toggleBookmark({ userId: otherUser.id, lessonId: lesson.id });

      const ids = getBookmarkedLessonIds({ userId: base.user.id, courseId: base.course.id });

      expect(ids).toHaveLength(0);
    });

    it("returns all bookmarked lesson IDs across multiple lessons", () => {
      const mod = testDb
        .insert(schema.modules)
        .values({ courseId: base.course.id, title: "Module", position: 1 })
        .returning()
        .get();

      const lesson1 = testDb
        .insert(schema.lessons)
        .values({ moduleId: mod.id, title: "Lesson 1", position: 1 })
        .returning()
        .get();

      const lesson2 = testDb
        .insert(schema.lessons)
        .values({ moduleId: mod.id, title: "Lesson 2", position: 2 })
        .returning()
        .get();

      const lesson3 = testDb
        .insert(schema.lessons)
        .values({ moduleId: mod.id, title: "Lesson 3", position: 3 })
        .returning()
        .get();

      toggleBookmark({ userId: base.user.id, lessonId: lesson1.id });
      toggleBookmark({ userId: base.user.id, lessonId: lesson3.id });

      const ids = getBookmarkedLessonIds({ userId: base.user.id, courseId: base.course.id });

      expect(ids).toHaveLength(2);
      expect(ids).toContain(lesson1.id);
      expect(ids).not.toContain(lesson2.id);
      expect(ids).toContain(lesson3.id);
    });
  });
});

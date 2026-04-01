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
  getCommentsForLesson,
  createComment,
  getCommentById,
  updateComment,
  deleteComment,
} from "./commentService";

function createLesson(courseId: number) {
  const mod = testDb
    .insert(schema.modules)
    .values({ courseId, title: "Module 1", position: 1 })
    .returning()
    .get();

  return testDb
    .insert(schema.lessons)
    .values({ moduleId: mod.id, title: "Lesson 1", position: 1 })
    .returning()
    .get();
}

describe("commentService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("createComment", () => {
    it("creates a comment and returns the row", () => {
      const lesson = createLesson(base.course.id);
      const comment = createComment(base.user.id, lesson.id, "Great lesson!");

      expect(comment).toBeDefined();
      expect(comment.userId).toBe(base.user.id);
      expect(comment.lessonId).toBe(lesson.id);
      expect(comment.body).toBe("Great lesson!");
    });
  });

  describe("getCommentsForLesson", () => {
    it("returns comments with user name joined", () => {
      const lesson = createLesson(base.course.id);
      createComment(base.user.id, lesson.id, "Hello!");

      const comments = getCommentsForLesson(lesson.id);

      expect(comments).toHaveLength(1);
      expect(comments[0].body).toBe("Hello!");
      expect(comments[0].userName).toBe(base.user.name);
    });

    it("returns all comments for the lesson", () => {
      const lesson = createLesson(base.course.id);
      createComment(base.user.id, lesson.id, "First");
      createComment(base.user.id, lesson.id, "Second");

      const comments = getCommentsForLesson(lesson.id);

      expect(comments).toHaveLength(2);
      const bodies = comments.map((c) => c.body);
      expect(bodies).toContain("First");
      expect(bodies).toContain("Second");
    });

    it("returns empty array when no comments exist", () => {
      const lesson = createLesson(base.course.id);
      expect(getCommentsForLesson(lesson.id)).toHaveLength(0);
    });
  });

  describe("getCommentById", () => {
    it("returns the comment by id", () => {
      const lesson = createLesson(base.course.id);
      const created = createComment(base.user.id, lesson.id, "Test");

      const found = getCommentById(created.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it("returns undefined for a non-existent id", () => {
      expect(getCommentById(999)).toBeUndefined();
    });
  });

  describe("updateComment", () => {
    it("updates the body", () => {
      const lesson = createLesson(base.course.id);
      const comment = createComment(base.user.id, lesson.id, "Original");

      const updated = updateComment(comment.id, "Edited");

      expect(updated).toBeDefined();
      expect(updated!.body).toBe("Edited");
    });
  });

  describe("deleteComment", () => {
    it("removes the comment so it no longer exists", () => {
      const lesson = createLesson(base.course.id);
      const comment = createComment(base.user.id, lesson.id, "To delete");

      deleteComment(comment.id);

      expect(getCommentById(comment.id)).toBeUndefined();
    });
  });
});
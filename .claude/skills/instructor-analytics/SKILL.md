---
name: instructor-analytics
description: Build instructor analytics dashboards showing revenue trends, enrollment counts, completion rates, quiz pass rates, and student drop-off points. Use when the user wants to add analytics, metrics, or reporting for instructors in Cadence LMS.
---

# Instructor Analytics

## Data Sources

All analytics data is available via existing services and tables:

| Metric | Table | Service |
|--------|-------|---------|
| Revenue | `purchases` (pricePaid, createdAt, country) | `purchaseService` |
| Enrollments | `enrollments` (enrolledAt, completedAt) | `enrollmentService` |
| Completion rate | `enrollments.completedAt` + `lesson_progress` | `progressService` |
| Quiz pass rate | `quiz_attempts` (score, passed) | `quizService` |
| Drop-off | `lesson_progress` per lesson position | `progressService` |

## Workflows

### Revenue Trends
Query `purchases` grouped by time period (day/week/month). Join to `courses` for per-course breakdown. Include PPP country data for regional insights.

```ts
// Group purchases by month for a course
db.select({ month: sql`strftime('%Y-%m', createdAt)`, total: sum(purchases.pricePaid) })
  .from(purchases)
  .where(eq(purchases.courseId, courseId))
  .groupBy(sql`strftime('%Y-%m', createdAt)`)
  .orderBy(sql`strftime('%Y-%m', createdAt)`)
```

### Enrollment Numbers
Use `enrollmentService.getEnrollmentCountForCourse()` for totals. For trend data, query `enrollments.enrolledAt` grouped by period.

### Completion Rate
```ts
const total = await enrollmentService.getEnrollmentCountForCourse({ courseId })
const completed = await db.select({ count: count() })
  .from(enrollments)
  .where(and(eq(enrollments.courseId, courseId), isNotNull(enrollments.completedAt)))
const rate = (completed / total) * 100
```

### Quiz Pass Rates
Per-quiz pass rate from `quiz_attempts`. Join through `quizzes → lessons → modules` to get course scope.

```ts
// Pass rate per quiz in a course
db.select({ quizId, passed: count(sql`CASE WHEN passed = 1 THEN 1 END`), total: count() })
  .from(quiz_attempts)
  .innerJoin(quizzes, eq(quiz_attempts.quizId, quizzes.id))
  .innerJoin(lessons, eq(quizzes.lessonId, lessons.id))
  .innerJoin(modules, eq(lessons.moduleId, modules.id))
  .where(eq(modules.courseId, courseId))
  .groupBy(quiz_attempts.quizId)
```

### Drop-off Points
Count distinct enrolled students vs students who completed each lesson. Sort by `modules.position`, `lessons.position` to show the funnel.

```ts
// Students who completed each lesson (ordered by position)
db.select({ lessonId, lessonTitle: lessons.title, modulePosition: modules.position,
            lessonPosition: lessons.position, completedCount: count() })
  .from(lesson_progress)
  .innerJoin(lessons, eq(lesson_progress.lessonId, lessons.id))
  .innerJoin(modules, eq(lessons.moduleId, modules.id))
  .where(and(eq(modules.courseId, courseId), eq(lesson_progress.status, 'Completed')))
  .groupBy(lesson_progress.lessonId)
  .orderBy(modules.position, lessons.position)
```
Compare each lesson's completedCount against total enrollments to get the drop-off funnel.

## Placement

- Add analytics to the existing instructor route: `app/routes/instructor.$courseId.tsx`
- Or create a dedicated route: `app/routes/instructor.$courseId.analytics.tsx`
- Scope all queries to `courseId` from the route param — instructors only see their own courses

## Key Constraints

- Always filter by `courseId` owned by the authenticated instructor (check `courses.instructorId`)
- Use `count()` from drizzle-orm, `sum()`, and `sql` template for aggregates
- Lessons/modules are ordered by `position` field — preserve this order in drop-off funnel
- `lesson_progress.status` values: `NotStarted | InProgress | Completed`
- `quiz_attempts.passed` is a boolean stored as integer in SQLite (0/1)

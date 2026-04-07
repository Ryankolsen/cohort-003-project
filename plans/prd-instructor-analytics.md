# PRD: Instructor Analytics Dashboard

## Problem Statement

Instructors on Cadence LMS have no visibility into how their courses are performing. They can see a student roster with individual progress, but there is no aggregated view showing revenue over time, how enrollment is growing, whether students are finishing the course, how well students perform on quizzes, or where in the course students are giving up. Without this data, instructors cannot make informed decisions about pricing, content improvements, or which lessons need rework.

## Solution

Add a dedicated Analytics tab to each instructor's course management page. The tab provides a summary dashboard with stat cards at the top (total revenue, total enrollments, completion rate, average rating) followed by time-series charts for revenue and enrollment trends, a quiz pass rate breakdown table, and a per-lesson drop-off funnel showing exactly where students stop progressing.

## User Stories

1. As an instructor, I want to see total revenue earned from my course, so that I know how much income the course has generated.
2. As an instructor, I want to see revenue grouped by month over the course's lifetime, so that I can identify whether sales are growing, declining, or seasonal.
3. As an instructor, I want to see total enrollment count for my course, so that I know how many students have purchased it.
4. As an instructor, I want to see enrollments grouped by month over the course's lifetime, so that I can track whether audience growth is accelerating or slowing.
5. As an instructor, I want to see the course completion rate as a percentage, so that I know how many enrolled students actually finish the course.
6. As an instructor, I want to see the average star rating for my course alongside the number of ratings submitted, so that I can gauge overall student satisfaction.
7. As an instructor, I want to see pass rates for each quiz in my course, so that I know which quizzes students find difficult.
8. As an instructor, I want to see total attempt counts alongside pass rates per quiz, so that I can tell whether low pass rates are due to difficulty or low engagement.
9. As an instructor, I want quizzes listed in the same order as lessons appear in the course, so that I can easily correlate quiz difficulty with where it falls in the curriculum.
10. As an instructor, I want to see how many students completed each lesson, so that I can identify the point in the course where students drop off.
11. As an instructor, I want drop-off data ordered by module and lesson position, so that the funnel reflects the actual course sequence.
12. As an instructor, I want drop-off counts expressed as a percentage of total enrolled students, so that I can compare lessons regardless of absolute enrollment size.
13. As an instructor, I want the analytics dashboard scoped to a single course at a time, so that I can focus on one course without data from other courses mixing in.
14. As an instructor, I want the analytics tab to be easily reachable from my course management page, so that I don't have to navigate to a separate part of the app.
15. As an instructor, I want all analytics data to reflect the lifetime of the course with no arbitrary date cutoff, so that I have the full picture of course performance.

## Implementation Decisions

### Modules to Build or Modify

**New: Analytics Service**
A dedicated service module encapsulating all analytics query logic. Functions include:
- `getRevenueTrend({ courseId })` — returns an array of `{ month: string, total: number }` grouped by calendar month, all time
- `getEnrollmentTrend({ courseId })` — returns an array of `{ month: string, count: number }` grouped by calendar month, all time
- `getCompletionRate({ courseId })` — returns `{ completed: number, total: number, rate: number }`
- `getAverageRating({ courseId })` — returns `{ average: number, count: number }`
- `getQuizPassRates({ courseId })` — returns an array of `{ quizId, quizTitle, lessonTitle, modulePosition, lessonPosition, passed: number, total: number, passRate: number }` ordered by module/lesson position
- `getDropOffFunnel({ courseId })` — returns an array of `{ lessonId, lessonTitle, moduleTitle, modulePosition, lessonPosition, completedCount: number, enrolledCount: number, percentage: number }` ordered by module/lesson position

This service is a deep module: it hides all SQL aggregation complexity behind simple, predictable interfaces.

**New: Analytics Route**
A new route at `instructor/:courseId/analytics` rendering the dashboard. The loader calls all six service functions and returns their results. No mutations — this page is read-only.

**Modified: Instructor Course Page**
Add an "Analytics" tab link in the existing course management navigation so instructors can switch between the course editor and analytics.

**Chart Library**
Install Recharts. Revenue trend uses a `LineChart`. Enrollment trend uses a `BarChart`. Both use monthly buckets on the X axis with all-time data.

### Authorization

All analytics queries must verify that the authenticated user is the instructor of the requested course. Queries are scoped to `courseId` and should join to `courses` to confirm ownership before returning data.

### Data Aggregation Notes

- Revenue and enrollment trends group by `strftime('%Y-%m', createdAt)` for SQLite-compatible monthly bucketing
- Drop-off funnel joins `lesson_progress` (where status = Completed) to `lessons` and `modules`, counts distinct users per lesson, and divides by total enrollment count
- Quiz pass rates join `quiz_attempts` through `quizzes → lessons → modules` and aggregate `passed` as a boolean (stored as 0/1 integer in SQLite)
- Module and lesson ordering relies on the `position` integer field present on both tables

## Testing Decisions

**What makes a good test:** Tests should verify external behavior — what the function returns given specific database state — not how the queries are constructed internally. Tests should seed the database with known data and assert on the returned values.

**Modules to test:**

- **Analytics Service** — all six functions. Seed a course with known purchases, enrollments, ratings, quiz attempts, and lesson progress records, then assert that each function returns the correct aggregated output. This is the primary test surface because the service encapsulates all the logic.

- **Drop-off funnel logic** — specifically verify that lessons are returned in module/lesson position order, that the percentage calculation is correct (e.g. 3 completions out of 10 enrollments = 30%), and that lessons with zero completions still appear in the funnel.

- **Quiz pass rate logic** — specifically verify that quizzes are returned in curriculum order, that pass rates are computed correctly across multiple attempts by multiple users, and that the best attempt per user is not assumed (all attempts count toward totals unless specified otherwise).

**Prior art:** Refer to existing service test files alongside current services for patterns around database seeding, test structure, and assertion style.

## Out of Scope

- Per-student revenue attribution or individual purchase history on the analytics page
- Date range filtering or custom time windows (all-time only for now)
- Export to CSV or PDF
- Real-time or auto-refreshing data
- Comparison between courses
- Student-level drop-off (which specific students stopped at which lesson)
- Video watch analytics (watch percentage, play/pause events)
- Comments or bookmark analytics
- Admin-level analytics across all instructors

## Further Notes

- The analytics route is read-only; no mutations should be possible from this page.
- The `analyticsService` functions should be individually importable so they can be tested and reused independently.
- If a course has no purchases, ratings, or quiz attempts, the dashboard should render gracefully with zeros rather than erroring.
- All monetary values are stored as numbers in the `purchases.pricePaid` column; no currency conversion is needed.
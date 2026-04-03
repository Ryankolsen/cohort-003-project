# Plan: Instructor Analytics Dashboard

> Source PRD: plans/prd-instructor-analytics.md

## Architectural decisions

- **Route**: `app/routes/instructor.$courseId.analytics.tsx` → `/instructor/:courseId/analytics`
- **Navigation**: New "Analytics" `<TabsTrigger>` added to the Radix Tabs in `instructor.$courseId.tsx` (alongside Content, Settings, Sales Copy, Students) — navigates to the analytics route rather than rendering inline
- **Service**: `app/services/analyticsService.ts` — 6 exported functions matching the PRD spec
- **Tests**: `app/services/analyticsService.test.ts` using the existing `createTestDb` / `seedBaseData` pattern
- **Charts**: Recharts (as specified in PRD)
- **Auth**: Loader verifies `course.instructorId === session.userId` before returning any data

---

## Phase 1: Analytics Shell + Stat Cards

**User stories**: 1, 3, 5, 6, 13, 14, 15

### What to build

Create the analytics route and wire up the tab link in the instructor course management page. Implement four service functions (`getRevenueTrend`, `getEnrollmentTrend`, `getCompletionRate`, `getAverageRating`) and call all four in the loader. Render a stat card grid showing total revenue (summed from trend data), total enrollments (summed from trend data), completion rate as a percentage, and average star rating with rating count. The page should render gracefully with zeros when a course has no purchases, ratings, or completions.

### Acceptance criteria

- [ ] An "Analytics" tab appears in the instructor course management page and navigates to the analytics route
- [ ] The loader rejects requests from users who are not the course instructor
- [ ] Four stat cards render: Total Revenue, Total Enrollments, Completion Rate, Average Rating
- [ ] A course with no data renders zeros without errors
- [ ] `getRevenueTrend`, `getEnrollmentTrend`, `getCompletionRate`, and `getAverageRating` each have passing tests seeded with known data

---

## Phase 2: Revenue & Enrollment Trend Charts

**User stories**: 2, 4

### What to build

Install Recharts. Add a `LineChart` for monthly revenue and a `BarChart` for monthly enrollments to the analytics page, using the data already returned by the Phase 1 loader. Both charts use calendar month buckets on the X axis covering the full lifetime of the course. No new service functions are needed — this phase is purely a UI addition on top of already-loaded data.

### Acceptance criteria

- [ ] Recharts is installed and importable
- [ ] A line chart renders below the stat cards showing monthly revenue over the course lifetime
- [ ] A bar chart renders showing monthly enrollment counts over the course lifetime
- [ ] Both charts label the X axis by month (e.g. `2025-01`)
- [ ] Charts render an empty/flat state gracefully when there is no trend data

---

## Phase 3: Quiz Pass Rates Table

**User stories**: 7, 8, 9

### What to build

Add `getQuizPassRates` to the analytics service. The function returns one row per quiz ordered by module position then lesson position, including quiz title, lesson title, total attempt count, pass count, and pass rate as a percentage. Render this as a table on the analytics page below the charts.

### Acceptance criteria

- [ ] `getQuizPassRates` is implemented and exported from `analyticsService.ts`
- [ ] The table renders quiz title, lesson title, attempt count, and pass rate
- [ ] Quizzes are listed in curriculum order (module position → lesson position)
- [ ] Pass rate is computed correctly across multiple attempts by multiple users
- [ ] A course with no quiz attempts renders an empty table without errors
- [ ] `getQuizPassRates` has passing tests covering ordering and pass rate math

---

## Phase 4: Drop-Off Funnel

**User stories**: 10, 11, 12

### What to build

Add `getDropOffFunnel` to the analytics service. The function returns one row per lesson ordered by module position then lesson position, including lesson title, module title, completed student count, total enrolled count, and completion percentage. Render this as a funnel list or table below the quiz section on the analytics page.

### Acceptance criteria

- [ ] `getDropOffFunnel` is implemented and exported from `analyticsService.ts`
- [ ] Lessons are returned in curriculum order (module position → lesson position)
- [ ] Completion percentage is calculated as `completedCount / enrolledCount * 100`
- [ ] Lessons with zero completions still appear in the funnel
- [ ] A course with no lesson progress renders all lessons at 0% without errors
- [ ] `getDropOffFunnel` has passing tests verifying ordering, percentage math, and zero-completion lessons
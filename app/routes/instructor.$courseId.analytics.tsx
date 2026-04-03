import type { Route } from "./+types/instructor.$courseId.analytics";
import { Link } from "react-router";
import { data } from "react-router";
import { getCurrentUserId } from "~/lib/session";
import { getUserById } from "~/services/userService";
import { getCourseById } from "~/services/courseService";
import {
  getRevenueTrend,
  getEnrollmentTrend,
  getCompletionRate,
  getAverageRating,
} from "~/services/analyticsService";
import { UserRole } from "~/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowLeft, DollarSign, Users, TrendingUp, Star } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export async function loader({ params, request }: Route.LoaderArgs) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    throw data("Select a user from the DevUI panel to manage courses.", {
      status: 401,
    });
  }

  const user = getUserById(currentUserId);

  if (!user || (user.role !== UserRole.Instructor && user.role !== UserRole.Admin)) {
    throw data("Only instructors and admins can access this page.", {
      status: 403,
    });
  }

  const courseId = parseInt(params.courseId, 10);
  if (isNaN(courseId)) {
    throw data("Invalid course ID.", { status: 400 });
  }

  const course = getCourseById(courseId);

  if (!course) {
    throw data("Course not found.", { status: 404 });
  }

  if (course.instructorId !== currentUserId && user.role !== UserRole.Admin) {
    throw data("You can only view analytics for your own courses.", {
      status: 403,
    });
  }

  const [revenueTrend, enrollmentTrend, completionRate, averageRating] =
    await Promise.all([
      getRevenueTrend({ courseId }),
      getEnrollmentTrend({ courseId }),
      getCompletionRate({ courseId }),
      getAverageRating({ courseId }),
    ]);

  const totalRevenue = revenueTrend.reduce((sum, row) => sum + row.total, 0);
  const totalEnrollments = enrollmentTrend.reduce((sum, row) => sum + row.count, 0);

  return {
    course,
    revenueTrend,
    enrollmentTrend,
    totalRevenue,
    totalEnrollments,
    completionRate,
    averageRating,
  };
}

export default function InstructorAnalytics({
  loaderData,
}: Route.ComponentProps) {
  const { course, revenueTrend, enrollmentTrend, totalRevenue, totalEnrollments, completionRate, averageRating } =
    loaderData;

  const revenueChartData = revenueTrend.map((row) => ({
    month: row.month,
    revenue: row.total / 100,
  }));

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/instructor/${course.id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to course
        </Link>
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <p className="text-muted-foreground">Analytics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<DollarSign className="size-5 text-muted-foreground" />}
          label="Total Revenue"
          value={`$${(totalRevenue / 100).toFixed(2)}`}
        />
        <StatCard
          icon={<Users className="size-5 text-muted-foreground" />}
          label="Total Enrollments"
          value={String(totalEnrollments)}
        />
        <StatCard
          icon={<TrendingUp className="size-5 text-muted-foreground" />}
          label="Completion Rate"
          value={`${completionRate.rate.toFixed(1)}%`}
          sub={`${completionRate.completed} of ${completionRate.total} students`}
        />
        <StatCard
          icon={<Star className="size-5 text-muted-foreground" />}
          label="Average Rating"
          value={
            averageRating.count > 0
              ? averageRating.average.toFixed(1)
              : "—"
          }
          sub={
            averageRating.count > 0
              ? `${averageRating.count} rating${averageRating.count === 1 ? "" : "s"}`
              : "No ratings yet"
          }
        />
      </div>

      {/* Revenue Trend Chart */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueChartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No revenue data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v) => [typeof v === "number" ? `$${v.toFixed(2)}` : v, "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" dot={false} strokeWidth={2} stroke="#6366f1" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Enrollment Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Enrollments Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {enrollmentTrend.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No enrollment data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={enrollmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, "Enrollments"]} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

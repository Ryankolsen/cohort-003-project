import { useSearchParams } from "react-router";
import { data, isRouteErrorResponse, Link } from "react-router";
import type { Route } from "./+types/admin.analytics";
import { getCurrentUserId } from "~/lib/session";
import { getUserById } from "~/services/userService";
import { UserRole } from "~/db/schema";
import {
  getAdminTotalRevenue,
  getAdminTotalEnrollments,
  getAdminTopEarningCourse,
  getAdminRevenueOverTime,
  type TimePeriod,
} from "~/services/adminAnalyticsService";
import { formatPrice } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { AlertTriangle, DollarSign, Users, Trophy } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type TooltipValue = number | string | readonly (string | number)[] | undefined;

const PERIODS: { label: string; value: TimePeriod }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "12m", value: "12m" },
  { label: "All", value: "all" },
];

function isValidPeriod(value: string): value is TimePeriod {
  return ["7d", "30d", "12m", "all"].includes(value);
}

export function meta() {
  return [
    { title: "Admin Analytics — Cadence" },
    { name: "description", content: "Platform-wide analytics" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    throw data("Select a user from the DevUI panel to view analytics.", {
      status: 401,
    });
  }

  const currentUser = getUserById(currentUserId);

  if (!currentUser || currentUser.role !== UserRole.Admin) {
    throw data("Only admins can access this page.", {
      status: 403,
    });
  }

  const url = new URL(request.url);
  const periodParam = url.searchParams.get("period") ?? "30d";
  const period: TimePeriod = isValidPeriod(periodParam) ? periodParam : "30d";

  const totalRevenue = getAdminTotalRevenue({ period });
  const totalEnrollments = getAdminTotalEnrollments({ period });
  const topEarningCourse = getAdminTopEarningCourse({ period });
  const revenueOverTime = getAdminRevenueOverTime({ period });

  return {
    totalRevenue,
    totalEnrollments,
    topEarningCourse,
    revenueOverTime,
    period,
  };
}

export default function AdminAnalytics({ loaderData }: Route.ComponentProps) {
  const {
    totalRevenue,
    totalEnrollments,
    topEarningCourse,
    revenueOverTime,
    period,
  } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const hasData = totalRevenue > 0 || totalEnrollments > 0;

  const revenueChartData = revenueOverTime.map((r) => ({
    date: r.date,
    revenue: r.revenue / 100,
  }));

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <p className="text-muted-foreground">
          Platform-wide revenue and enrollment metrics
        </p>
      </div>

      {/* Time Period Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border p-1 w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setSearchParams({ period: p.value })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              period === p.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="text-center">
            <DollarSign className="mx-auto mb-4 size-12 text-muted-foreground" />
            <h2 className="mb-2 text-lg font-semibold">No data yet</h2>
            <p className="text-sm text-muted-foreground">
              Revenue and enrollment data will appear here once students start
              purchasing courses.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={<DollarSign className="size-5 text-muted-foreground" />}
              label="Total Revenue"
              value={formatPrice(totalRevenue)}
            />
            <StatCard
              icon={<Users className="size-5 text-muted-foreground" />}
              label="Total Enrollments"
              value={String(totalEnrollments)}
            />
            <StatCard
              icon={<Trophy className="size-5 text-muted-foreground" />}
              label="Top Earning Course"
              value={topEarningCourse?.title ?? "—"}
              sub={
                topEarningCourse
                  ? formatPrice(topEarningCourse.revenue)
                  : undefined
              }
            />
          </div>

          {/* Revenue Over Time Chart */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Revenue Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueChartData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No revenue data yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v: number) => `$${v}`}
                    />
                    <Tooltip
                      formatter={(v: TooltipValue) => [
                        typeof v === "number"
                          ? `$${v.toFixed(2)}`
                          : String(v ?? ""),
                        "Revenue",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      dot={false}
                      strokeWidth={2}
                      stroke="#6366f1"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
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

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let message = "An unexpected error occurred while loading analytics.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 401) {
      title = "Sign in required";
      message =
        typeof error.data === "string"
          ? error.data
          : "Please select a user from the DevUI panel.";
    } else if (error.status === 403) {
      title = "Access denied";
      message =
        typeof error.data === "string"
          ? error.data
          : "Only admins can access this page.";
    } else {
      title = `Error ${error.status}`;
      message = typeof error.data === "string" ? error.data : error.statusText;
    }
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="text-center">
        <AlertTriangle className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">{title}</h1>
        <p className="mb-6 text-muted-foreground">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

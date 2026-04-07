import { data } from "react-router";
import type { Route } from "./+types/api.instructor-courses";
import { getCurrentUserId } from "~/lib/session";
import { getUserById } from "~/services/userService";
import { getCoursesByInstructor } from "~/services/courseService";
import { UserRole } from "~/db/schema";

export async function loader({ request }: Route.LoaderArgs) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    throw data("Unauthorized", { status: 401 });
  }

  const currentUser = getUserById(currentUserId);
  if (!currentUser || currentUser.role !== UserRole.Admin) {
    throw data("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const userId = parseInt(url.searchParams.get("userId") ?? "", 10);

  if (isNaN(userId)) {
    throw data("Invalid userId", { status: 400 });
  }

  const courses = getCoursesByInstructor(userId);

  return { courses: courses.map((c) => ({ id: c.id, title: c.title })) };
}

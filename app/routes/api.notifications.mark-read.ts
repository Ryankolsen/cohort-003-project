import * as v from "valibot";
import type { Route } from "./+types/api.notifications.mark-read";
import { getCurrentUserId } from "~/lib/session";
import { parseFormData } from "~/lib/validation";
import { markAsRead, getNotifications } from "~/services/notificationService";

const markReadSchema = v.object({
  notificationId: v.pipe(
    v.string(),
    v.transform(Number),
    v.number(),
    v.integer(),
    v.minValue(1, "Invalid notification ID")
  ),
});

export async function action({ request }: Route.ActionArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const parsed = parseFormData(formData, markReadSchema);

  if (!parsed.success) {
    throw new Response("Invalid notification ID", { status: 400 });
  }

  // Verify the notification belongs to this user
  const userNotifications = getNotifications(userId, 1000, 0);
  const owns = userNotifications.some((n) => n.id === parsed.data.notificationId);
  if (!owns) {
    throw new Response("Not found", { status: 404 });
  }

  markAsRead(parsed.data.notificationId);

  return { ok: true };
}

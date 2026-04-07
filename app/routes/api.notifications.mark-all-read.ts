import type { Route } from "./+types/api.notifications.mark-all-read";
import { getCurrentUserId } from "~/lib/session";
import { markAllAsRead } from "~/services/notificationService";

export async function action({ request }: Route.ActionArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  markAllAsRead(userId);

  return { ok: true };
}

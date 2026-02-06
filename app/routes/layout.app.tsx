import { Outlet } from "react-router";
import type { Route } from "./+types/layout.app";
import { Sidebar } from "~/components/sidebar";
import { DevUI } from "~/components/dev-ui";
import { Toaster } from "sonner";
import { getAllUsers, getUserById } from "~/services/userService";
import { getCurrentUserId } from "~/lib/session";

export async function loader({ request }: Route.LoaderArgs) {
  const users = getAllUsers();
  const currentUserId = await getCurrentUserId(request);
  const currentUser = currentUserId ? getUserById(currentUserId) : null;

  return {
    users: users.map((u) => ({ id: u.id, name: u.name, role: u.role })),
    currentUser: currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role, avatarUrl: currentUser.avatarUrl ?? null }
      : null,
  };
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const { users, currentUser } = loaderData;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentUser={currentUser} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
      <DevUI users={users} currentUser={currentUser} />
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}

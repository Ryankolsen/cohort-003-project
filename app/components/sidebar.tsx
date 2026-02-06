import { NavLink, Form } from "react-router";
import { useState, useEffect } from "react";
import { cn } from "~/lib/utils";
import { UserRole } from "~/db/schema";
import {
  BookOpen,
  LayoutDashboard,
  GraduationCap,
  Shield,
  Users,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";

interface CurrentUser {
  id: number;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
}

interface SidebarProps {
  currentUser: CurrentUser | null;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles: UserRole[] | "all";
}

const navItems: NavItem[] = [
  {
    label: "Browse Courses",
    to: "/courses",
    icon: <BookOpen className="size-4" />,
    roles: "all",
  },
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: <LayoutDashboard className="size-4" />,
    roles: [UserRole.Student],
  },
  {
    label: "My Courses",
    to: "/instructor",
    icon: <GraduationCap className="size-4" />,
    roles: [UserRole.Instructor],
  },
  {
    label: "Manage Users",
    to: "/admin/users",
    icon: <Users className="size-4" />,
    roles: [UserRole.Admin],
  },
  {
    label: "Manage Courses",
    to: "/admin/courses",
    icon: <Shield className="size-4" />,
    roles: [UserRole.Admin],
  },
];

function isVisible(item: NavItem, role: UserRole | null): boolean {
  if (item.roles === "all") return true;
  if (!role) return false;
  return item.roles.includes(role);
}

function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="size-8 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground">
      {initials}
    </div>
  );
}

export function Sidebar({ currentUser }: SidebarProps) {
  const currentUserRole = currentUser?.role ?? null;
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleDarkMode() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("ralph-theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <NavLink to="/" className="text-lg font-bold tracking-tight">
          Ralph
        </NavLink>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.filter((item) => isVisible(item, currentUserRole)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-1">
        <button
          onClick={toggleDarkMode}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {isDark ? "Light Mode" : "Dark Mode"}
        </button>

        {currentUser && (
          <div className="flex items-center gap-3 rounded-md px-3 py-2">
            <UserAvatar name={currentUser.name} avatarUrl={currentUser.avatarUrl} />
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium">{currentUser.name}</div>
              <div className="truncate text-xs capitalize text-sidebar-foreground/50">{currentUser.role}</div>
            </div>
            <Form method="post" action="/api/logout">
              <button
                type="submit"
                title="Sign out"
                className="rounded-md p-1 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LogOut className="size-4" />
              </button>
            </Form>
          </div>
        )}
      </div>
    </aside>
  );
}

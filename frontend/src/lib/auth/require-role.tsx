"use client";

import type { Role } from "./types";
import { useAuth } from "./auth-context";

export function RequireRole({
  role,
  children,
  fallback = null,
}: {
  role: Role | Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();
  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

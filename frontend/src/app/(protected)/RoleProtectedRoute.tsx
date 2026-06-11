"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { PageSkeleton } from "../../components/PageSkeleton";
import { canAccessPage, type AppRole, type PageAccessKey } from "../../utils/access";

type RoleProtectedRouteProps = {
  children: React.ReactNode;
  pageKey?: PageAccessKey;
  allowedRoles?: readonly AppRole[];
  deniedRedirect?: string;
};

export default function RoleProtectedRoute({
  children,
  pageKey,
  allowedRoles,
  deniedRedirect = "/login",
}: RoleProtectedRouteProps) {
  const { token, user, loading } = useAuth();
  const router = useRouter();

  const roleAllowed =
    !allowedRoles?.length || (user?.role ? allowedRoles.includes(user.role) : false);
  const pageAllowed = !pageKey || canAccessPage(user?.role, pageKey);
  const hasAccess = Boolean(token && user && roleAllowed && pageAllowed);

  useEffect(() => {
    if (loading) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!hasAccess) {
      router.replace(deniedRedirect);
    }
  }, [loading, token, hasAccess, router, deniedRedirect]);

  if (loading || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageSkeleton />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-rose-600">
        Access denied.
      </div>
    );
  }

  return <>{children}</>;
}

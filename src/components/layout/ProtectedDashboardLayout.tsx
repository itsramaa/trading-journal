/**
 * ProtectedDashboardLayout - Persistent layout wrapper for protected routes
 * Combines ProtectedRoute + DashboardLayout + React Router Outlet
 * Keeps sidebar, header, ticker mounted during page transitions
 */
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "./DashboardLayout";

export function ProtectedDashboardLayout() {
  return (
    <ProtectedRoute>
      <DashboardLayout />
    </ProtectedRoute>
  );
}

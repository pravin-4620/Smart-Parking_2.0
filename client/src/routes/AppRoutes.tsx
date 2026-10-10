import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { UserRole } from '@smart-parking/shared';
import { MainLayout } from '../layouts/MainLayout';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { RoleGuard } from '../components/RoleGuard';
import { useAuth } from '../hooks/useAuth';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NearbyParkingPage } from '../pages/NearbyParkingPage';
import { ParkingDetailPage } from '../pages/ParkingDetailPage';
import { NewBookingPage } from '../pages/NewBookingPage';
import { BookingDetailPage } from '../pages/BookingDetailPage';
import { MyBookingsPage } from '../pages/MyBookingsPage';
import { MySessionsPage } from '../pages/MySessionsPage';
import { MyVehiclesPage } from '../pages/MyVehiclesPage';
import { MyRFIDPage } from '../pages/MyRFIDPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { ManagerDashboardPage } from '../pages/manager/ManagerDashboardPage';
import { ManagerParkingPage } from '../pages/manager/ManagerParkingPage';
import { ManagerSlotsPage } from '../pages/manager/ManagerSlotsPage';
import { ManagerReservationsPage } from '../pages/manager/ManagerReservationsPage';
import { ManagerSessionsPage } from '../pages/manager/ManagerSessionsPage';
import { ManagerDevicesPage } from '../pages/manager/ManagerDevicesPage';
import { ManagerPricingPage } from '../pages/manager/ManagerPricingPage';
import { ManagerAnalyticsPage } from '../pages/manager/ManagerAnalyticsPage';
import { ManagerReportsPage } from '../pages/manager/ManagerReportsPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage';
import { AdminManagersPage } from '../pages/admin/AdminManagersPage';
import { AdminParkingPage } from '../pages/admin/AdminParkingPage';
import { AdminSlotsPage } from '../pages/admin/AdminSlotsPage';
import { AdminReservationsPage } from '../pages/admin/AdminReservationsPage';
import { AdminPaymentsPage } from '../pages/admin/AdminPaymentsPage';
import { AdminDevicesPage } from '../pages/admin/AdminDevicesPage';
import { AdminPricingPage } from '../pages/admin/AdminPricingPage';
import { AdminAnalyticsPage } from '../pages/admin/AdminAnalyticsPage';
import { AdminReportsPage } from '../pages/admin/AdminReportsPage';
import { AdminAuditPage } from '../pages/admin/AdminAuditPage';
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage';

const RoleBasedHome: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === UserRole.ADMIN) return <Navigate to="/admin" replace />;
  if (user.role === UserRole.PARKING_MANAGER) return <Navigate to="/manager" replace />;
  return <Navigate to="/dashboard" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<RoleBasedHome />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/system-status" element={<HomePage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/nearby" element={<NearbyParkingPage />} />
          <Route path="/nearby-parking" element={<NearbyParkingPage />} />
          <Route path="/parking/:parkingId" element={<ParkingDetailPage />} />
          <Route path="/booking" element={<NewBookingPage />} />
          <Route path="/booking/:id" element={<BookingDetailPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
          <Route path="/my-sessions" element={<MySessionsPage />} />
          <Route path="/my-vehicles" element={<MyVehiclesPage />} />
          <Route path="/my-rfid" element={<MyRFIDPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          <Route element={<RoleGuard allowedRoles={[UserRole.PARKING_MANAGER]} />}>
            <Route path="/manager" element={<ManagerDashboardPage />} />
            <Route path="/manager/parking" element={<ManagerParkingPage />} />
            <Route path="/manager/slots" element={<ManagerSlotsPage />} />
            <Route path="/manager/reservations" element={<ManagerReservationsPage />} />
            <Route path="/manager/sessions" element={<ManagerSessionsPage />} />
            <Route path="/manager/devices" element={<ManagerDevicesPage />} />
            <Route path="/manager/pricing" element={<ManagerPricingPage />} />
            <Route path="/manager/analytics" element={<ManagerAnalyticsPage />} />
            <Route path="/manager/reports" element={<ManagerReportsPage />} />
          </Route>

          <Route element={<RoleGuard allowedRoles={[UserRole.ADMIN]} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/managers" element={<AdminManagersPage />} />
            <Route path="/admin/parking" element={<AdminParkingPage />} />
            <Route path="/admin/slots" element={<AdminSlotsPage />} />
            <Route path="/admin/reservations" element={<AdminReservationsPage />} />
            <Route path="/admin/payments" element={<AdminPaymentsPage />} />
            <Route path="/admin/devices" element={<AdminDevicesPage />} />
            <Route path="/admin/pricing" element={<AdminPricingPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/audit" element={<AdminAuditPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

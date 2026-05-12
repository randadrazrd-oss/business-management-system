import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Specialists from './pages/Specialists';
import Children from './pages/Children';
import ScheduleGrid from './pages/ScheduleGrid';
import Login from './pages/Login';
import ChildProfile from './pages/ChildProfile';
import ProtectedRoute from './components/ProtectedRoute';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// New Pages
import Unauthorized from './pages/Unauthorized';
import UserManagement from './pages/admin/UserManagement';
import MySchedule from './pages/MySchedule';
import WeeklyReport from './pages/reports/WeeklyReport';
import MonthlyReport from './pages/reports/MonthlyReport';
import SessionsLog from './pages/reports/SessionsLog';

/**
 * A tiny wrapper to inline Role protection inside <Routes>
 */
const RoleGuard = ({ children, allowedRoles }) => {
  return <ProtectedRoute allowedRoles={allowedRoles}>{children}</ProtectedRoute>;
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'font-bold rounded-2xl shadow-xl border-2 border-white',
              duration: 4000,
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      {/* Common fallbacks / unauthorized */}
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/unauthorized" element={<Unauthorized />} />

                      {/* Specialist-Only Routes */}
                      <Route path="/my-schedule" element={
                        <RoleGuard allowedRoles={['specialist']}>
                          <MySchedule />
                        </RoleGuard>
                      } />

                      {/* Admin & Secretary Default Routes */}
                      <Route path="/dashboard" element={
                        <RoleGuard allowedRoles={['admin', 'secretary']}>
                          <Dashboard />
                        </RoleGuard>
                      } />
                      <Route path="/specialists" element={
                        <RoleGuard allowedRoles={['admin', 'secretary']}>
                          <Specialists />
                        </RoleGuard>
                      } />
                      <Route path="/children" element={
                        <RoleGuard allowedRoles={['admin', 'secretary']}>
                          <Children />
                        </RoleGuard>
                      } />
                      <Route path="/children/:id" element={
                        <RoleGuard allowedRoles={['admin', 'secretary']}>
                          <ChildProfile />
                        </RoleGuard>
                      } />
                      <Route path="/schedule" element={
                        <RoleGuard allowedRoles={['admin', 'secretary']}>
                          <ScheduleGrid />
                        </RoleGuard>
                      } />

                      {/* Admin & Secretary Report Routes */}
                      <Route path="/reports/weekly" element={
                         <RoleGuard allowedRoles={['admin', 'secretary']}>
                           <WeeklyReport />
                         </RoleGuard>
                      } />
                      <Route path="/reports/monthly" element={
                         <RoleGuard allowedRoles={['admin', 'secretary']}>
                           <MonthlyReport />
                         </RoleGuard>
                      } />
                      <Route path="/reports/sessions-log" element={
                         <RoleGuard allowedRoles={['admin', 'secretary']}>
                           <SessionsLog />
                         </RoleGuard>
                      } />

                      {/* Admin-Only Routes */}
                      <Route path="/admin/users" element={
                        <RoleGuard allowedRoles={['admin']}>
                          <UserManagement />
                        </RoleGuard>
                      } />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;

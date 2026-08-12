import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import DashboardPage from '@/pages/dashboard'
import TodayPage from '@/pages/today'
import UpcomingPage from '@/pages/upcoming'
import OverduePage from '@/pages/overdue'
import CompletedPage from '@/pages/completed'
import CalendarPage from '@/pages/calendar'
import CategoriesPage from '@/pages/categories'
import SettingsPage from '@/pages/settings'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/upcoming" element={<UpcomingPage />} />
        <Route path="/overdue" element={<OverduePage />} />
        <Route path="/completed" element={<CompletedPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

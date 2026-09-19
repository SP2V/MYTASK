import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { RequireAuth } from '@/components/auth/require-auth'
import LoginPage from '@/pages/login'
import DashboardPage from '@/pages/dashboard'
import TodayPage from '@/pages/today'
import UpcomingPage from '@/pages/upcoming'
import OverduePage from '@/pages/overdue'
import CompletedPage from '@/pages/completed'
import CalendarPage from '@/pages/calendar'
import CategoriesPage from '@/pages/categories'
import PostitPage from '@/pages/postit'
import ProjectsPage from '@/pages/projects'
import SettingsPage from '@/pages/settings'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/upcoming" element={<UpcomingPage />} />
          <Route path="/overdue" element={<OverduePage />} />
          <Route path="/completed" element={<CompletedPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/postit" element={<PostitPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

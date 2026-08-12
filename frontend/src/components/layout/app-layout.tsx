import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Header } from '@/components/layout/header'

export function AppLayout() {
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4 md:px-6 md:pb-6 md:pt-6">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}

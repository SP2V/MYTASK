import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Header } from '@/components/layout/header'

export function AppLayout() {
  return (
    <div className="flex min-h-dvh w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 px-4 pb-24 pt-4 md:px-6 md:pb-6 md:pt-6">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}

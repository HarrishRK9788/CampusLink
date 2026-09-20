import Link from 'next/link'
import { logout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 border-b p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex gap-6 items-center">
          <Link href="/" className="font-bold text-xl tracking-tight">College Hub</Link>
          <nav className="hidden md:flex gap-4">
            <Link href="/resources" className="text-sm font-medium text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors">Knowledge Base</Link>
            <Link href="/discuss" className="text-sm font-medium text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors">Discuss</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ModeToggle />
          <Link href="/profile" className="text-sm font-medium text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white">Profile</Link>
          <Link href="/logout" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
            Logout
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}

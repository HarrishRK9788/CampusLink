import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('name').eq('id', user.id).single()
    profile = data
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back{profile?.name ? `, ${profile.name}` : ''}!</h1>
        <p className="text-muted-foreground mt-2">Here is what is happening around your college.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>Find study materials and notes for your subjects.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/resources" className={buttonVariants({ className: 'w-full' })}>Browse Notes</Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Discussion Board</CardTitle>
            <CardDescription>See what other students are talking about.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/discuss" className={buttonVariants({ variant: 'outline', className: 'w-full' })}>Go to Discussions</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

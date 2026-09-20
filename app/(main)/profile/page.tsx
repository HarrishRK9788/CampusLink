import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { deletePost, deleteResource } from './actions'
import { formatDistanceToNow } from 'date-fns'

export default async function ProfilePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, colleges(name)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return <div>Profile not found.</div>
  }

  // Fetch user's posts
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch user's resources
  const { data: resources } = await supabase
    .from('resources')
    .select('*, subjects(name)')
    .eq('uploaded_by', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground mt-2">
          {profile.name} • {profile.colleges?.name}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* User's Discussions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Your Discussions</h2>
          {(!posts || posts.length === 0) ? (
            <div className="text-center p-8 border rounded-lg bg-card text-muted-foreground border-dashed">
              You haven't started any discussions yet.
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <Card key={post.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      <Link href={`/discuss/${post.id}`} className="hover:underline">
                        {post.title}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      Posted {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground flex gap-4">
                      <span>{post.score} votes</span>
                      <span>{post.comment_count} comments</span>
                    </div>
                    <form action={deletePost.bind(null, post.id)}>
                      <Button variant="destructive" size="sm">Delete</Button>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* User's Notes */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Your Uploaded Notes</h2>
          {(!resources || resources.length === 0) ? (
            <div className="text-center p-8 border rounded-lg bg-card text-muted-foreground border-dashed">
              You haven't uploaded any notes yet.
            </div>
          ) : (
            <div className="space-y-4">
              {resources.map(resource => (
                <Card key={resource.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      <Link href={`/resources/view/${resource.id}`} className="hover:underline">
                        {resource.title}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {resource.subjects?.name} • Unit {resource.unit}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground flex gap-4">
                      <span>{resource.downloads} downloads</span>
                    </div>
                    <form action={deleteResource.bind(null, resource.id)}>
                      <Button variant="destructive" size="sm">Delete</Button>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

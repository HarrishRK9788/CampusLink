import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function DiscussPage({
  searchParams
}: {
  searchParams: Promise<{ sort?: string }>
}) {
  const resolvedSearchParams = await searchParams;
  const sort = resolvedSearchParams.sort || 'new'
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('college_id')
    .eq('id', user.id)
    .single()

  if (!profile?.college_id) {
    return <div className="p-8 text-center text-red-500">Error: Profile not linked to a college.</div>
  }

  // Fetch posts for the user's college
  let query = supabase
    .from('posts')
    .select(`
      id,
      title,
      body,
      tag,
      score,
      comment_count,
      created_at,
      author_id,
      profiles!posts_author_id_fkey ( name )
    `)
    .eq('college_id', profile.college_id)

  if (sort === 'top') {
    query = query.order('score', { ascending: false }).order('created_at', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data: posts, error } = await query

  if (error) {
    console.error("Error fetching posts:", JSON.stringify(error, null, 2))
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discussion Board</h1>
          <p className="text-muted-foreground mt-2">Connect, ask questions, and share advice with students at your college.</p>
        </div>
        <Link 
          href="/discuss/new" 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Create Post
        </Link>
      </div>

      <div className="flex gap-4 border-b pb-2">
        <Link 
          href="/discuss?sort=new" 
          className={`font-medium pb-2 border-b-2 transition-colors ${sort === 'new' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          New
        </Link>
        <Link 
          href="/discuss?sort=top" 
          className={`font-medium pb-2 border-b-2 transition-colors ${sort === 'top' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Top
        </Link>
      </div>

      {(!posts || posts.length === 0) ? (
        <div className="text-center p-12 border rounded-lg bg-card text-card-foreground shadow-sm border-dashed">
          <h3 className="text-lg font-medium">No posts yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">Be the first to start a discussion!</p>
          <Link 
            href="/discuss/new" 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Create Post
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post: any) => (
            <Link href={`/discuss/${post.id}`} key={post.id} className="block group">
              <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm hover:border-gray-400 transition-colors flex gap-4">
                {/* Voting UI placeholder (Not interactive on feed list for MVP to keep it simple, just displays score) */}
                <div className="flex flex-col items-center min-w-[40px] text-gray-500 bg-gray-50 dark:bg-gray-800 rounded p-2 self-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><path d="m18 15-6-6-6 6"/></svg>
                  <span className="font-bold text-sm text-foreground">{post.score}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1"><path d="m6 9 6 6 6-6"/></svg>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {post.tag && (
                      <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs font-semibold rounded">
                        {post.tag}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground font-medium">
                      Posted by {post.author_id === user.id ? 'you' : (post.profiles?.name || 'Anonymous')} • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold group-hover:text-primary transition-colors mb-2">
                    {post.title}
                  </h2>
                  {post.body && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {post.body}
                    </p>
                  )}
                  
                  <div className="flex items-center text-xs font-medium text-muted-foreground gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {post.comment_count} Comments
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { VoteButtons } from '@/components/VoteButtons'
import { createComment, deleteComment } from './actions'
import { deletePost } from '@/app/(main)/profile/actions'

export default async function PostDetailPage({
  params
}: {
  params: Promise<{ postId: string }>
}) {
  const resolvedParams = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  const isAdmin = currentUserProfile?.role === 'admin'

  // Fetch the post
  const { data: post, error: postError } = await supabase
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
    .eq('id', resolvedParams.postId)
    .single() as any

  if (postError || !post) {
    return <div className="p-8 text-center">Post not found.</div>
  }

  // Fetch the user's vote on this post
  const { data: userVoteRecord } = await supabase
    .from('post_votes')
    .select('value')
    .eq('post_id', post.id)
    .eq('user_id', user.id)
    .single()
    
  const initialUserVote = (userVoteRecord?.value as 1 | -1) || 0

  // Fetch comments
  const { data: comments } = await supabase
    .from('comments')
    .select(`
      id,
      body,
      created_at,
      author_id,
      profiles!comments_author_id_fkey ( name )
    `)
    .eq('post_id', post.id)
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/discuss" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back to Discussions
      </Link>

      <div className="flex gap-4">
        <VoteButtons 
          postId={post.id} 
          initialScore={post.score} 
          initialUserVote={initialUserVote} 
        />
        
        <div className="flex-1 bg-card text-card-foreground shadow-sm border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            {post.tag && (
              <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs font-semibold rounded">
                {post.tag}
              </span>
            )}
            <span className="text-sm text-muted-foreground font-medium">
              Posted by {post.author_id === user.id ? 'you' : (post.profiles?.name || 'Anonymous')} • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
          
          <div className="flex justify-between items-start gap-4">
            <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
            {(isAdmin || post.author_id === user.id) && (
              <form action={deletePost.bind(null, post.id)}>
                <button type="submit" className="text-xs text-red-500 hover:underline px-2 py-1 border border-red-200 bg-red-50 rounded whitespace-nowrap">Delete Post</button>
              </form>
            )}
          </div>
          {post.body && (
            <div className="prose dark:prose-invert max-w-none text-base">
              {post.body.split('\n').map((paragraph: string, idx: number) => (
                <p key={idx} className="min-h-[1rem]">{paragraph}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 ml-14">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          {post.comment_count} Comments
        </h3>

        <form action={createComment.bind(null, post.id)} className="mb-8 bg-card border rounded-lg p-4">
          <textarea
            name="body"
            required
            rows={3}
            placeholder="What are your thoughts?"
            className="w-full bg-transparent border-0 focus-visible:ring-0 resize-none p-0 text-sm"
          />
          <div className="flex justify-end mt-2 pt-2 border-t">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4"
            >
              Comment
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {comments && comments.length > 0 ? (
            comments.map((comment: any) => (
              <div key={comment.id} className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {(comment.profiles?.name || 'A')[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold">{comment.author_id === user.id ? 'you' : (comment.profiles?.name || 'Anonymous')}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {(isAdmin || comment.author_id === user.id) && (
                    <form action={deleteComment.bind(null, comment.id, post.id)}>
                      <button type="submit" className="text-xs text-red-500 hover:underline">Delete</button>
                    </form>
                  )}
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {comment.body}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-8 border rounded-lg border-dashed text-muted-foreground">
              No comments yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createComment(postId: string, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be logged in to comment.')

  const body = formData.get('body') as string
  if (!body) throw new Error('Comment body is required.')

  const { error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      author_id: user.id,
      body: body
    })

  if (error) {
    console.error('Error creating comment:', error)
    throw new Error('Failed to create comment.')
  }

  revalidatePath(`/discuss/${postId}`)
  revalidatePath('/discuss')
}

export async function votePost(postId: string, value: 1 | -1) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be logged in to vote.')

  // Upsert the vote
  const { error } = await supabase
    .from('post_votes')
    .upsert({
      post_id: postId,
      user_id: user.id,
      value: value
    }, {
      onConflict: 'post_id,user_id'
    })

  if (error) {
    console.error('Error voting:', error)
    throw new Error('Failed to record vote.')
  }

  revalidatePath(`/discuss/${postId}`)
  revalidatePath('/discuss')
}

export async function deleteComment(commentId: string, postId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  let query = supabase.from('comments').delete().eq('id', commentId)
  if (!isAdmin) {
    query = query.eq('author_id', user.id)
  }

  const { error } = await query

  if (error) {
    console.error('Error deleting comment:', error)
    throw new Error('Failed to delete comment')
  }

  revalidatePath(`/discuss/${postId}`)
}

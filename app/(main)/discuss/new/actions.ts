'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createPost(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be logged in to post.')

  const title = formData.get('title') as string
  const body = formData.get('body') as string
  const tag = formData.get('tag') as string

  if (!title) {
    throw new Error('Title is required.')
  }

  // Get user's college_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('college_id')
    .eq('id', user.id)
    .single()

  if (!profile?.college_id) {
    throw new Error('Profile not linked to a college.')
  }

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      title,
      body: body || null,
      tag: tag || null,
      author_id: user.id,
      college_id: profile.college_id
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating post:', error)
    throw new Error('Failed to create post.')
  }

  revalidatePath('/discuss')
  redirect(`/discuss/${post.id}`)
}

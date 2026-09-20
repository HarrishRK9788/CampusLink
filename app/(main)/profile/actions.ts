'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function deletePost(postId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  let query = supabase.from('posts').delete().eq('id', postId)
  if (!isAdmin) {
    query = query.eq('author_id', user.id) // Ensure they own it if not admin
  }

  const { error } = await query

  if (error) {
    console.error('Error deleting post:', error)
    throw new Error('Failed to delete post')
  }

  revalidatePath('/profile')
  revalidatePath('/discuss')
}

export async function deleteResource(resourceId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  let query = supabase.from('resources').delete().eq('id', resourceId)
  if (!isAdmin) {
    query = query.eq('uploaded_by', user.id) // Ensure they own it if not admin
  }

  const { error } = await query

  if (error) {
    console.error('Error deleting resource:', error)
    throw new Error('Failed to delete resource')
  }

  revalidatePath('/profile')
  revalidatePath('/resources')
}

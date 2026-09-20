'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function downloadResourceAction(formData: FormData) {
  const resourceId = formData.get('resourceId') as string
  const fileUrl = formData.get('fileUrl') as string

  if (!resourceId || !fileUrl) {
    throw new Error('Invalid resource data')
  }

  const supabase = await createClient()

  // Increment the download count using the RPC function we will add, or a simple update
  // Since multiple users could download at once, an RPC (increment_download) is safer, 
  // but for MVP, doing a read-then-write or simple update works.
  
  // Get current downloads
  const { data: resource } = await supabase
    .from('resources')
    .select('downloads')
    .eq('id', resourceId)
    .single()

  if (resource) {
    await supabase
      .from('resources')
      .update({ downloads: resource.downloads + 1 })
      .eq('id', resourceId)
  }

  // Redirect the user to the file URL to trigger download
  redirect(fileUrl)
}

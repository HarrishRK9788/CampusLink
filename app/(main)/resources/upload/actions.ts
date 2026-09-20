'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function uploadResource(formData: FormData) {
  const supabase = await createClient()
  
  // 1. Verify Authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be logged in to upload.')
  }

  // 2. Extract Data
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const subjectId = formData.get('subjectId') as string
  const tagsString = formData.get('tags') as string
  const unitString = formData.get('unit') as string
  const file = formData.get('file') as File

  if (!title || !subjectId || !file || file.size === 0 || !unitString) {
    throw new Error('Title, Subject, Unit, and File are required.')
  }

  const unit = parseInt(unitString, 10)
  if (isNaN(unit) || unit < 1 || unit > 5) {
    throw new Error('Unit must be between 1 and 5.')
  }

  // Parse tags
  const tags = tagsString 
    ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    : []

  // 3. Upload File to Supabase Storage
  // Generate a safe, unique filename
  const fileExt = file.name.split('.').pop()
  const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const fileName = `${Date.now()}_${safeTitle}.${fileExt}`
  const filePath = `${subjectId}/${fileName}` // Group by subject in storage

  const { data: storageData, error: storageError } = await supabase.storage
    .from('resources')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (storageError) {
    console.error('Storage Error:', storageError)
    throw new Error(`File upload failed: ${storageError.message}`)
  }

  // 4. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('resources')
    .getPublicUrl(filePath)

  // 5. Insert Row into Database
  const { error: dbError } = await supabase
    .from('resources')
    .insert({
      subject_id: subjectId,
      uploaded_by: user.id,
      title: title,
      description: description,
      file_url: publicUrl,
      file_type: file.type,
      tags: tags,
      unit: unit
    })

  if (dbError) {
    console.error('Database Error:', dbError)
    // If DB insert fails, we should ideally clean up the uploaded file, but ignoring for MVP simplicity
    throw new Error(`Database insert failed: ${dbError.message}`)
  }

  // 6. Revalidate and Redirect
  revalidatePath(`/resources/subject/${subjectId}`)
  redirect(`/resources/subject/${subjectId}`)
}

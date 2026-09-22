'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // We ask the user for "username", but Supabase Auth requires an email.
  // We transparently append the dummy domain behind the scenes.
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  
  const dummyEmail = `${username}@collegehub.local`

  const { error } = await supabase.auth.signInWithPassword({
    email: dummyEmail,
    password,
  })

  if (error) {
    redirect('/login?error=Could not authenticate user')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const username = formData.get('username') as string
  const password = formData.get('password') as string

  const dummyEmail = `${username}@collegehub.local`

  const { error } = await supabase.auth.signUp({
    email: dummyEmail,
    password,
    options: {
      data: {
        username: username, // Important for the profile creation trigger
      },
    },
  })

  if (error) {
    console.error('Signup error:', error.message)
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

const getURL = async () => {
  let url = 'http://localhost:3000'
  try {
    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = headersList.get('x-forwarded-proto') || 'http'
    if (host) {
      url = `${protocol}://${host}`
    }
  } catch (e) {
    url = process.env.NEXT_PUBLIC_SITE_URL ?? 
          process.env.VERCEL_URL ?? 
          'http://localhost:3000'
    url = url.includes('http') ? url : `https://${url}`
  }
  url = url.replace(/\/$/, '')
  return url
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const redirectUrl = await getURL()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${redirectUrl}/auth/callback`,
    },
  })

  if (data.url) {
    redirect(data.url)
  }
}

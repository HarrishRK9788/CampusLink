import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// Force dynamic so it actually runs the query every time instead of caching it
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Make a lightweight query to the database just to register "activity" with Supabase
    const { data, error } = await supabase.from('departments').select('id').limit(1)
    
    if (error) throw error

    return NextResponse.json({ 
      status: 'active', 
      message: 'Supabase is awake!', 
      timestamp: new Date().toISOString() 
    })
  } catch (error) {
    return NextResponse.json({ status: 'error', error }, { status: 500 })
  }
}

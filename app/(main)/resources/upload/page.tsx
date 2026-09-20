import { createClient } from '@/utils/supabase/server'
import { uploadResource } from './actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

export default async function UploadResourcePage({
  searchParams
}: {
  searchParams: Promise<{ subjectId?: string }>
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Please log in to upload resources.</div>
  }

  // Fetch the user's profile to get their college_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('college_id')
    .eq('id', user.id)
    .single()

  if (!profile?.college_id) {
    return <div>Error: Profile not linked to a college.</div>
  }

  // Fetch all subjects for this college to populate the dropdown
  // We join through departments to filter by the user's college
  const { data: subjectsData } = await supabase
    .from('subjects')
    .select('*, departments!inner(college_id)')
    .eq('departments.college_id', profile.college_id)
    .order('name')

  // We have to type cast or map because PostgREST returns a flattened shape for inner joins depending on setup
  const subjects = subjectsData || []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Upload Notes</h1>
        <Link 
          href={resolvedSearchParams.subjectId ? `/resources/subject/${resolvedSearchParams.subjectId}` : '/resources'} 
          className={buttonVariants({ variant: 'outline' })}
        >
          Cancel
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resource Details</CardTitle>
          <CardDescription>Share your study materials with your college network.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={uploadResource} className="space-y-4">
            
            <div className="space-y-2">
              <label htmlFor="subjectId" className="text-sm font-medium">Subject *</label>
              <select 
                id="subjectId" 
                name="subjectId" 
                defaultValue={resolvedSearchParams.subjectId || ''}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="" disabled>Select a subject...</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} (Year {subject.year}, Sem {subject.semester})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">Title *</label>
              <input 
                id="title"
                name="title" 
                type="text" 
                required 
                placeholder="e.g. Midterm 1 Study Guide"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="unit" className="text-sm font-medium">Unit *</label>
              <select 
                id="unit" 
                name="unit" 
                required
                defaultValue=""
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="" disabled>Select the unit...</option>
                <option value="1">Unit 1</option>
                <option value="2">Unit 2</option>
                <option value="3">Unit 3</option>
                <option value="4">Unit 4</option>
                <option value="5">Unit 5</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <textarea 
                id="description"
                name="description" 
                rows={3}
                placeholder="Briefly describe what this file contains..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="tags" className="text-sm font-medium">Tags (comma-separated)</label>
              <input 
                id="tags"
                name="tags" 
                type="text" 
                placeholder="e.g. notes, unit1, important"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="file" className="text-sm font-medium">File *</label>
              <input 
                id="file"
                name="file" 
                type="file" 
                required
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground">Max file size depends on your Supabase configuration (default 50MB).</p>
            </div>

            <Button type="submit" className="w-full mt-6">Upload Resource</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

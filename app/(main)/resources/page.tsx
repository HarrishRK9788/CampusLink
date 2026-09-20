import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ResourceDrilldown } from '@/components/ResourceDrilldown'

export default async function ResourcesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user's college
  const { data: profile } = await supabase
    .from('profiles')
    .select('college_id')
    .eq('id', user.id)
    .single()

  if (!profile?.college_id) {
    return <div>Error: Profile not linked to a college.</div>
  }

  const query = resolvedSearchParams.q

  // Search Flow
  if (query) {
    const { data: searchResults } = await supabase
      .from('subjects')
      .select('*, departments!inner(college_id)')
      .eq('departments.college_id', profile.college_id)
      .ilike('name', `%${query}%`)
      .order('name')

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search Results</h1>
          <p className="text-muted-foreground mt-2">Showing subjects matching "{query}"</p>
        </div>

        <form method="GET" action="/resources" className="flex gap-2 mb-6">
          <input 
            type="text" 
            name="q" 
            defaultValue={query}
            placeholder="Search for a subject (e.g. Calculus)..."
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          />
          <button type="submit" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            Search
          </button>
          <a href="/resources" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
            Clear
          </a>
        </form>

        {(!searchResults || searchResults.length === 0) ? (
          <div className="text-center p-12 border rounded-lg bg-gray-50 dark:bg-gray-900 border-dashed">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No results found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your keywords.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {searchResults.map((subject: any) => (
              <div key={subject.id} className="p-4 border rounded-lg hover:border-gray-400 transition-colors bg-card text-card-foreground shadow-sm">
                <a href={`/resources/subject/${subject.id}`} className="font-semibold text-lg hover:underline block mb-1">
                  {subject.name}
                </a>
                <p className="text-sm text-muted-foreground mb-2">
                  Year {subject.year}, Semester {subject.semester} • {subject.course_category}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Browse Flow (Default)
  const { data: departments } = await supabase
    .from('departments')
    .select('*')
    .eq('college_id', profile.college_id)
    .order('name')

  const departmentIds = departments?.map(d => d.id) || []
  let subjects = []
  
  if (departmentIds.length > 0) {
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('*')
      .in('department_id', departmentIds)
      .order('name')
    
    if (subjectsData) {
      subjects = subjectsData
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground mt-2">Find notes, past papers, and study materials for your subjects.</p>
        </div>
      </div>

      <form method="GET" action="/resources" className="flex gap-2 mb-6">
        <input 
          type="text" 
          name="q" 
          placeholder="Search for a subject (e.g. Calculus)..."
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
        />
        <button type="submit" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
          Search
        </button>
      </form>

      <ResourceDrilldown departments={departments || []} subjects={subjects} />
    </div>
  )
}

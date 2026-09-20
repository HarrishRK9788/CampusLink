import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'

export default async function SubjectResourcesPage({
  params,
  searchParams
}: {
  params: Promise<{ subjectId: string }>,
  searchParams: Promise<{ unit?: string }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient()
  
  const { data: subject } = await supabase
    .from('subjects')
    .select('*, departments(name)')
    .eq('id', resolvedParams.subjectId)
    .single()

  console.log('Subject lookup:', { id: resolvedParams.subjectId, found: !!subject })

  if (!subject) {
    return <div>Subject not found.</div>
  }

  let query = supabase
    .from('resources')
    .select('*, profiles(name)')
    .eq('subject_id', resolvedParams.subjectId)
    .order('created_at', { ascending: false })

  if (resolvedSearchParams.unit) {
    query = query.eq('unit', parseInt(resolvedSearchParams.unit, 10))
  }

  const { data: resources } = await query

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{subject.name}</h1>
          <p className="text-muted-foreground mt-2">
            {subject.departments?.name} • Year {subject.year} • Semester {subject.semester} • {subject.regulation_tag}
          </p>
        </div>
        <Link href={`/resources/upload?subjectId=${subject.id}`} className={buttonVariants()}>
          Upload Notes
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold tracking-tight">Study Materials</h2>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Filter by Unit:</span>
            <Link href={`/resources/subject/${subject.id}`} className={`px-3 py-1 rounded-full text-sm ${!resolvedSearchParams.unit ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>All</Link>
            {[1, 2, 3, 4, 5].map(u => (
              <Link 
                key={u} 
                href={`/resources/subject/${subject.id}?unit=${u}`} 
                className={`px-3 py-1 rounded-full text-sm ${resolvedSearchParams.unit === u.toString() ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
              >
                Unit {u}
              </Link>
            ))}
          </div>
        </div>
        
        {(!resources || resources.length === 0) ? (
          <div className="text-center p-12 border rounded-lg bg-gray-50 dark:bg-gray-900 border-dashed">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No resources yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">Be the first to upload notes for this subject!</p>
            <Link href={`/resources/upload?subjectId=${subject.id}`} className={buttonVariants({ variant: 'outline' })}>
              Upload Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {resources.map(resource => (
              <Card key={resource.id} className="hover:border-gray-400 transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg">
                    <Link href={`/resources/view/${resource.id}`} className="hover:underline">
                      {resource.title}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    Uploaded by {resource.profiles?.name || 'Unknown'} • {new Date(resource.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{resource.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                      Unit {resource.unit}
                    </span>
                    {resource.tags && resource.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{resource.downloads} downloads</span>
                    <Link href={`/resources/view/${resource.id}`} className={buttonVariants({ size: 'sm' })}>
                      View & Download
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

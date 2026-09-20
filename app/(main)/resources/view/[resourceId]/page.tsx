import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { downloadResourceAction } from './actions'
import { deleteResource } from '@/app/(main)/profile/actions'

export default async function ResourceDetailPage({
  params
}: {
  params: Promise<{ resourceId: string }>
}) {
  const resolvedParams = await params;
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    isAdmin = profile?.role === 'admin'
  }

  // Fetch the resource details
  const { data: resource, error } = await supabase
    .from('resources')
    .select('*, profiles(name), subjects(name, year, semester, departments(name))')
    .eq('id', resolvedParams.resourceId)
    .single()

  if (error || !resource) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Resource not found</h2>
        <Link href="/resources" className={buttonVariants({ variant: 'outline', className: 'mt-4' })}>
          Back to Resources
        </Link>
      </div>
    )
  }

  // Format file size or type if needed
  const fileExtension = resource.file_url.split('.').pop()?.toUpperCase()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/resources/subject/${resource.subject_id}`} className={buttonVariants({ variant: 'outline' })}>
          Back to Subject
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-bold tracking-tight">{resource.title}</CardTitle>
              <CardDescription className="mt-2 text-base">
                Uploaded by {resource.profiles?.name || 'Unknown'} on {new Date(resource.created_at).toLocaleDateString()}
              </CardDescription>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              {(isAdmin || (user && resource.uploaded_by === user.id)) && (
                <form action={deleteResource.bind(null, resource.id)}>
                  <Button type="submit" variant="destructive" size="lg">Delete Resource</Button>
                </form>
              )}
              <form action={downloadResourceAction}>
                <input type="hidden" name="resourceId" value={resource.id} />
                <input type="hidden" name="fileUrl" value={resource.file_url} />
                <Button type="submit" size="lg" className="gap-2">
                  Download {fileExtension && `(${fileExtension})`}
                </Button>
              </form>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border">
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Subject Info</h3>
            <p className="text-sm">
              {resource.subjects?.name} • Year {resource.subjects?.year} • Sem {resource.subjects?.semester}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Description</h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {resource.description || 'No description provided.'}
            </p>
          </div>

          {resource.tags && resource.tags.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {resource.tags.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="pt-6 mt-6 border-t text-sm text-muted-foreground">
            Total Downloads: {resource.downloads}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

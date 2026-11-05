import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { MovieActions } from '@/components/movie-actions'
import Image from 'next/image'
import { redirect } from 'next/navigation'

async function getMovie(id: string) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: movie, error } = await supabase
    .from('movies')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('Error fetching movie:', error)
    return null
  }

  return movie
}

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const movie = await getMovie(id)

  if (!movie) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            ← Back to Movies
          </Button>
        </Link>

        <div className="grid md:grid-cols-3 gap-6">
          {movie.poster && movie.poster !== 'N/A' && (
            <div className="md:col-span-1">
              <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden">
                <Image
                  src={movie.poster}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            </div>
          )}

          <div className={movie.poster && movie.poster !== 'N/A' ? 'md:col-span-2' : 'md:col-span-3'}>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-3xl">{movie.title}</CardTitle>
                  <Badge
                    variant={
                      (movie as any).status === 'watched' ? 'default' :
                      (movie as any).status === 'favorites' ? 'secondary' : 'outline'
                    }
                    className="ml-4"
                  >
                    {(movie as any).status === 'watched' ? 'Watched' :
                     (movie as any).status === 'favorites' ? 'Favorites' :
                     (movie as any).watched ? 'Watched' : 'Watchlist'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  {movie.year && (
                    <div>
                      <p className="text-sm text-muted-foreground">Year</p>
                      <p className="font-medium">{movie.year}</p>
                    </div>
                  )}
                  {movie.runtime && (
                    <div>
                      <p className="text-sm text-muted-foreground">Runtime</p>
                      <p className="font-medium">{movie.runtime}</p>
                    </div>
                  )}
                  {movie.genre && (
                    <div>
                      <p className="text-sm text-muted-foreground">Genre</p>
                  <Badge variant="secondary">{movie.genre}</Badge>
                    </div>
                  )}
                  {movie.rating && (
                    <div>
                      <p className="text-sm text-muted-foreground">Your Rating</p>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500 text-xl">★</span>
                        <span className="font-medium text-xl">{movie.rating}/10</span>
                      </div>
                    </div>
                  )}
                  {movie.imdb_rating && (
                    <div>
                      <p className="text-sm text-muted-foreground">IMDb Rating</p>
                      <p className="font-medium">{movie.imdb_rating}/10</p>
                    </div>
                  )}
                  {movie.metascore && (
                    <div>
                      <p className="text-sm text-muted-foreground">Metascore</p>
                      <p className="font-medium">{movie.metascore}</p>
                    </div>
                  )}
                </div>

                {movie.director && (
                  <div>
                    <p className="text-sm text-muted-foreground">Director</p>
                    <p className="font-medium">{movie.director}</p>
                  </div>
                )}

                {movie.actors && (
                  <div>
                    <p className="text-sm text-muted-foreground">Actors</p>
                    <p className="font-medium">{movie.actors}</p>
                  </div>
                )}

                {movie.plot && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Plot</p>
                    <p className="text-sm">{movie.plot}</p>
                  </div>
                )}

                {movie.language && (
                  <div>
                    <p className="text-sm text-muted-foreground">Language</p>
                    <p className="font-medium">{movie.language}</p>
                  </div>
                )}

                {movie.country && (
                  <div>
                    <p className="text-sm text-muted-foreground">Country</p>
                    <p className="font-medium">{movie.country}</p>
                  </div>
                )}

                {movie.awards && (
                  <div>
                    <p className="text-sm text-muted-foreground">Awards</p>
                    <p className="font-medium">{movie.awards}</p>
                  </div>
                )}

                {movie.imdb_id && (
                  <div>
                    <p className="text-sm text-muted-foreground">IMDb ID</p>
                    <a
                      href={`https://www.imdb.com/title/${movie.imdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {movie.imdb_id}
                    </a>
                  </div>
                )}

                {movie.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Your Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{movie.notes}</p>
                  </div>
                )}

                <div className="flex gap-4 pt-4 border-t">
                  <MovieActions movieId={movie.id} />
                </div>

                <div className="text-xs text-muted-foreground">
                  Added: {new Date(movie.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

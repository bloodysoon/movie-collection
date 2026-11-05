'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MovieCard } from '@/components/movie-card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Movie } from '@/types/movie'
import { useParams } from 'next/navigation'

export default function SharedPage() {
  const params = useParams()
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function loadSharedMovies() {
      const token = params.token as string

      const { data: movies, error } = await supabase
        .rpc('get_movies_by_share_token', { p_share_token: token })

      if (error) {
        console.error('Error fetching shared movies:', error)
        setError(true)
      } else {
        setMovies(movies || [])
      }
      setLoading(false)
    }

    loadSharedMovies()
  }, [params.token])

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  if (error || movies.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">This collection is not available or has been removed.</p>
          <Link href="/">
            <Button>Create your own collection</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Shared Movie Collection</h1>
        <p className="text-muted-foreground">
          Browse this collection of {movies.length} movies
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {movies.map((movie) => (
          <div key={movie.id} className="opacity-90">
            <MovieCard movie={movie} readonly />
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link href="/">
          <Button variant="outline">Create Your Own Collection</Button>
        </Link>
      </div>
    </div>
  )
}

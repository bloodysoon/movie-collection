'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MovieCard } from '@/components/movie-card'
import { Button } from '@/components/ui/button'
import { Movie } from '@/types/movie'
import { useAuth } from '@/contexts/auth-context'

type SortField = 'created_at' | 'year' | 'rating' | 'title' | 'actors' | 'genre'
type SortOrder = 'asc' | 'desc'

export default function Home() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [filterYear, setFilterYear] = useState<string>('')
  const [filterGenre, setFilterGenre] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function loadMovies() {
      if (!user) return

      const { data: movies, error } = await supabase
        .from('movies')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching movies:', error)
        setMovies([])
      } else {
        setMovies(movies)
      }
      setLoading(false)
    }

    if (user) {
      loadMovies()
    }
  }, [user])

  const sortedMovies = [...movies].sort((a, b) => {
    let comparison = 0

    switch (sortField) {
      case 'year':
        comparison = (a.year || 0) - (b.year || 0)
        break
      case 'rating':
        comparison = (a.rating || 0) - (b.rating || 0)
        break
      case 'title':
        comparison = a.title.localeCompare(b.title)
        break
      case 'actors':
        comparison = (a.actors || '').localeCompare(b.actors || '')
        break
      case 'genre':
        comparison = (a.genre || '').localeCompare(b.genre || '')
        break
      case 'created_at':
      default:
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })

  const filteredMovies = sortedMovies.filter(movie => {
    const yearMatch = filterYear === '' || movie.year?.toString() === filterYear
    const movieGenres = movie.genre?.split(',').map(g => g.trim()) || []
    const genreMatch = filterGenre === '' || movieGenres.includes(filterGenre)
    const statusMatch = filterStatus === '' || movie.status === filterStatus
    return yearMatch && genreMatch && statusMatch
  })

  // Get unique years and genres for filter options
  const uniqueYears = [...new Set(movies.map(m => m.year).filter(Boolean))].sort((a, b) => (b || 0) - (a || 0))
  const uniqueGenres = [...new Set(
    movies
      .map(m => m.genre)
      .filter(Boolean)
      .flatMap(genre => genre.split(',').map(g => g.trim()))
  )].sort()

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  if (authLoading || loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Movies</h1>
        <p className="text-muted-foreground">
          Track your favorite movies and what you've watched
        </p>
      </div>

      {movies.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No movies yet</p>
          <a
            href="/add"
            className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Add your first movie
          </a>
        </div>
      ) : (
        <>
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium py-2">Filter by:</span>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-background"
              >
                <option value="">All Years</option>
                {uniqueYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={filterGenre}
                onChange={(e) => setFilterGenre(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-background"
              >
                <option value="">All Genres</option>
                {uniqueGenres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-background"
              >
                <option value="">All Status</option>
                <option value="watchlist">Watchlist</option>
                <option value="watched">Watched</option>
                <option value="favorites">Favorites</option>
              </select>
              {(filterYear || filterGenre || filterStatus) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterYear('')
                    setFilterGenre('')
                    setFilterStatus('')
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium py-2">Sort by:</span>
              <Button
                variant={sortField === 'created_at' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSort('created_at')}
              >
                Date Added {sortField === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortField === 'title' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSort('title')}
              >
                Title {sortField === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortField === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSort('year')}
              >
                Year {sortField === 'year' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortField === 'rating' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSort('rating')}
              >
                Rating {sortField === 'rating' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortField === 'genre' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSort('genre')}
              >
                Genre {sortField === 'genre' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortField === 'actors' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSort('actors')}
              >
                Actors {sortField === 'actors' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>

          {filteredMovies.length === 0 && movies.length > 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No movies match your filters</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

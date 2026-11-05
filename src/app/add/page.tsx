'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { searchMovies, getMovieDetails, mapOMDBToMovieFormData, OMDBMovie } from '@/lib/omdb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MovieFormData } from '@/types/movie'
import { useAuth } from '@/contexts/auth-context'

export default function AddMoviePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OMDBMovie[]>([])
  const [showSearch, setShowSearch] = useState(true)
  const [existingImdbIds, setExistingImdbIds] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState<MovieFormData>({
    title: '',
    year: undefined,
    genre: undefined,
    rating: undefined,
    status: 'watchlist',
    notes: undefined,
    actors: undefined,
    director: undefined,
    plot: undefined,
    poster: undefined,
    imdb_id: undefined,
    runtime: undefined,
    language: undefined,
    country: undefined,
    awards: undefined,
    metascore: undefined,
    imdb_rating: undefined,
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Load existing movie imdb_ids on mount
  useEffect(() => {
    async function loadExistingMovies() {
      if (!user) return

      const { data: movies } = await supabase
        .from('movies')
        .select('imdb_id')
        .eq('user_id', user.id)

      const imdbIds = new Set(
        movies
          ?.map(m => m.imdb_id)
          .filter(Boolean) || []
      )
      setExistingImdbIds(imdbIds)
    }

    if (user) {
      loadExistingMovies()
    }
  }, [user])

  // Debounced search - searches automatically as user types
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setSearching(true)
        try {
          const results = await searchMovies(searchQuery)
          setSearchResults(results)
        } catch (error) {
          console.error('Error searching movies:', error)
        } finally {
          setSearching(false)
        }
      } else {
        setSearchResults([])
      }
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  if (authLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  if (!user) {
    return null
  }

  const handleSelectMovie = async (imdbId: string) => {
    if (existingImdbIds.has(imdbId)) {
      alert('This movie is already in your collection!')
      return
    }

    setSearching(true)
    try {
      const details = await getMovieDetails(imdbId)
      const mappedData = mapOMDBToMovieFormData(details)
      setFormData(mappedData)
      setShowSearch(false)
      setSearchResults([])
      setSearchQuery('')
    } catch (error) {
      console.error('Error fetching movie details:', error)
      alert('Failed to fetch movie details')
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('movies').insert({
        user_id: user.id,
        title: formData.title,
        year: formData.year || null,
        genre: formData.genre || null,
        rating: formData.rating || null,
        status: formData.status,
        notes: formData.notes || null,
        actors: formData.actors || null,
        director: formData.director || null,
        plot: formData.plot || null,
        poster: formData.poster || null,
        imdb_id: formData.imdb_id || null,
        runtime: formData.runtime || null,
        language: formData.language || null,
        country: formData.country || null,
        awards: formData.awards || null,
        metascore: formData.metascore || null,
        imdb_rating: formData.imdb_rating || null,
      })

      if (error) throw error

      // Update existing imdb_ids
      if (formData.imdb_id) {
        setExistingImdbIds(prev => new Set([...prev, formData.imdb_id]))
      }

      // Reset form data
      setFormData({
        title: '',
        year: undefined,
        genre: undefined,
        rating: undefined,
        status: 'watchlist',
        notes: undefined,
        actors: undefined,
        director: undefined,
        plot: undefined,
        poster: undefined,
        imdb_id: undefined,
        runtime: undefined,
        language: undefined,
        country: undefined,
        awards: undefined,
        metascore: undefined,
        imdb_rating: undefined,
      })
      setShowSearch(true)

      router.push('/')
    } catch (error: any) {
      console.error('Error adding movie:', error)
      if (error.code === '23505') {
        alert('This movie is already in your collection!')
      } else {
        alert('Failed to add movie')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Add New Movie</h1>

        {showSearch ? (
          <Card>
            <CardHeader>
              <CardTitle>Search for a Movie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium mb-2">
                  Search OMDB
                </label>
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Start typing to search movies..."
                  autoFocus
                />
                {searching && (
                  <p className="text-sm text-muted-foreground mt-2">Searching...</p>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map((movie) => {
                    const isAdded = existingImdbIds.has(movie.imdbID)
                    return (
                      <div
                        key={movie.imdbID}
                        className={`flex items-center gap-4 p-3 border rounded-lg ${
                          isAdded
                            ? 'bg-muted/50 opacity-60 cursor-not-allowed'
                            : 'hover:bg-accent cursor-pointer'
                        }`}
                        onClick={() => !isAdded && handleSelectMovie(movie.imdbID)}
                      >
                        {movie.Poster && movie.Poster !== 'N/A' && (
                          <img
                            src={movie.Poster}
                            alt={movie.Title}
                            className="w-16 h-24 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{movie.Title}</p>
                          <p className="text-sm text-muted-foreground">{movie.Year}</p>
                          {isAdded && (
                            <p className="text-xs text-muted-foreground">Already in collection</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isAdded}
                          variant={isAdded ? 'secondary' : 'default'}
                        >
                          {isAdded ? 'Added already' : 'Select'}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSearch(false)}
                >
                  Enter Manually
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push('/')}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Movie Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium mb-2">
                    Title *
                  </label>
                  <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter movie title"
                  />
                </div>

                <div>
                  <label htmlFor="year" className="block text-sm font-medium mb-2">
                    Year
                  </label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year || ''}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="2024"
                  />
                </div>

                <div>
                  <label htmlFor="genre" className="block text-sm font-medium mb-2">
                    Genre
                  </label>
                  <Input
                    id="genre"
                    value={formData.genre || ''}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    placeholder="Action, Drama, Comedy..."
                  />
                </div>

                <div>
                  <label htmlFor="actors" className="block text-sm font-medium mb-2">
                    Actors
                  </label>
                  <Input
                    id="actors"
                    value={formData.actors || ''}
                    onChange={(e) => setFormData({ ...formData, actors: e.target.value })}
                    placeholder="Actor names separated by commas"
                  />
                </div>

                <div>
                  <label htmlFor="director" className="block text-sm font-medium mb-2">
                    Director
                  </label>
                  <Input
                    id="director"
                    value={formData.director || ''}
                    onChange={(e) => setFormData({ ...formData, director: e.target.value })}
                    placeholder="Director name"
                  />
                </div>

                <div>
                  <label htmlFor="rating" className="block text-sm font-medium mb-2">
                    Rating (0-10)
                  </label>
                  <Input
                    id="rating"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={formData.rating || ''}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="8.5"
                  />
                </div>

                <div>
                  <label htmlFor="plot" className="block text-sm font-medium mb-2">
                    Plot
                  </label>
                  <Textarea
                    id="plot"
                    value={formData.plot || ''}
                    onChange={(e) => setFormData({ ...formData, plot: e.target.value })}
                    placeholder="Movie plot summary..."
                    rows={3}
                  />
                </div>

                <div>
                  <label htmlFor="poster" className="block text-sm font-medium mb-2">
                    Poster URL
                  </label>
                  <Input
                    id="poster"
                    value={formData.poster || ''}
                    onChange={(e) => setFormData({ ...formData, poster: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium mb-2">
                    Status
                  </label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="watchlist">Watchlist</option>
                    <option value="watched">Watched</option>
                    <option value="favorites">Favorites</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium mb-2">
                    Notes
                  </label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Your thoughts about the movie..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-4">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Movie'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSearch(true)}
                  >
                    Search OMDB
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push('/')}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

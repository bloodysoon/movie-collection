'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MovieFormData } from '@/types/movie'
import { useAuth } from '@/contexts/auth-context'

export default function EditMoviePage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  if (authLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  if (!user) {
    return null
  }

  useEffect(() => {
    async function loadMovie() {
      if (!user) return

      const { data: movie, error } = await supabase
        .from('movies')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error loading movie:', error)
        router.push('/')
        return
      }

      setFormData({
        title: movie.title,
        year: movie.year || undefined,
        genre: movie.genre || undefined,
        rating: movie.rating || undefined,
        status: movie.status || 'watchlist',
        notes: movie.notes || undefined,
        actors: movie.actors || undefined,
        director: movie.director || undefined,
        plot: movie.plot || undefined,
        poster: movie.poster || undefined,
        imdb_id: movie.imdb_id || undefined,
        runtime: movie.runtime || undefined,
        language: movie.language || undefined,
        country: movie.country || undefined,
        awards: movie.awards || undefined,
        metascore: movie.metascore || undefined,
        imdb_rating: movie.imdb_rating || undefined,
      })
      setLoading(false)
    }

    if (user) {
      loadMovie()
    }
  }, [params.id, router, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('movies')
        .update({
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
        .eq('id', params.id)
        .eq('user_id', user.id)

      if (error) throw error

      router.push(`/movie/${params.id}`)
    } catch (error) {
      console.error('Error updating movie:', error)
      alert('Failed to update movie')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Edit Movie</h1>

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
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/movie/${params.id}`)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

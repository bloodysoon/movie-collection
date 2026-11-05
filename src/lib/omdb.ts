export interface OMDBMovie {
  Title: string
  Year: string
  imdbID: string
  Type: string
  Poster: string
}

export interface OMDBMovieDetails extends OMDBMovie {
  Genre: string
  Director: string
  Actors: string
  Plot: string
  Language: string
  Country: string
  Awards: string
  Metascore: string
  imdbRating: string
  Runtime: string
}

const API_KEY = process.env.NEXT_PUBLIC_OMDB_API_KEY
const BASE_URL = 'https://www.omdbapi.com'

export async function searchMovies(query: string): Promise<OMDBMovie[]> {
  if (!API_KEY) {
    throw new Error('OMDB API key is not configured')
  }

  const response = await fetch(
    `${BASE_URL}/?apikey=${API_KEY}&s=${encodeURIComponent(query)}&type=movie`
  )

  if (!response.ok) {
    throw new Error('Failed to search movies')
  }

  const data = await response.json()

  if (data.Response === 'False') {
    return []
  }

  return data.Search || []
}

export async function getMovieDetails(imdbId: string): Promise<OMDBMovieDetails> {
  if (!API_KEY) {
    throw new Error('OMDB API key is not configured')
  }

  const response = await fetch(
    `${BASE_URL}/?apikey=${API_KEY}&i=${imdbId}&plot=full`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch movie details')
  }

  const data = await response.json()

  if (data.Response === 'False') {
    throw new Error(data.Error || 'Movie not found')
  }

  return data
}

export function mapOMDBToMovieFormData(omdbMovie: OMDBMovieDetails) {
  return {
    title: omdbMovie.Title,
    year: parseInt(omdbMovie.Year) || undefined,
    genre: omdbMovie.Genre || undefined,
    actors: omdbMovie.Actors || undefined,
    director: omdbMovie.Director || undefined,
    plot: omdbMovie.Plot || undefined,
    poster: omdbMovie.Poster || undefined,
    imdb_id: omdbMovie.imdbID || undefined,
    runtime: omdbMovie.Runtime || undefined,
    language: omdbMovie.Language || undefined,
    country: omdbMovie.Country || undefined,
    awards: omdbMovie.Awards || undefined,
    metascore: omdbMovie.Metascore || undefined,
    imdb_rating: omdbMovie.imdbRating || undefined,
    status: 'watchlist',
    notes: undefined,
  }
}

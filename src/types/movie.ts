
export type MovieStatus = "watched" | "watchlist";

export interface Movie {
  id: number;
  title: string;
  year?: number;
  genre?: string;
  rating?: number;
  status: MovieStatus;
  is_favorite: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;

  // OMDB fields
  actors?: string;
  director?: string;
  plot?: string;
  poster?: string;
  imdb_id?: string;
  runtime?: string;
  language?: string;
  country?: string;
  awards?: string;
  metascore?: string;
  imdb_rating?: string;
}

export interface MovieFormData {
  title: string;
  year?: number;
  genre?: string;
  rating?: number;
  status: MovieStatus;
  is_favorite?: boolean;
  notes?: string;
  actors?: string;
  director?: string;
  plot?: string;
  poster?: string;
  imdb_id?: string;
  runtime?: string;
  language?: string;
  country?: string;
  awards?: string;
  metascore?: string;
  imdb_rating?: string;
}

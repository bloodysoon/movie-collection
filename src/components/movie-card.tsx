import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Movie } from '@/types/movie'

interface MovieCardProps {
  movie: Movie
  readonly?: boolean
}

export function MovieCard({ movie, readonly = false }: MovieCardProps) {
  const cardContent = (
    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
      {movie.poster && movie.poster !== 'N/A' && (
        <div className="relative w-full h-64">
          <Image
            src={movie.poster}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
      <CardHeader>
        <CardTitle className="line-clamp-2">{movie.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {movie.year && (
            <p className="text-sm text-muted-foreground">{movie.year}</p>
          )}
          {movie.genre && (
            <Badge variant="secondary">{movie.genre}</Badge>
          )}
          {movie.actors && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {movie.actors}
            </p>
          )}
          {movie.rating && (
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">★</span>
              <span className="text-sm font-medium">{movie.rating}/10</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Badge
          variant={
            (movie as any).status === 'watched' ? 'default' :
            (movie as any).status === 'favorites' ? 'secondary' : 'outline'
          }
        >
          {(movie as any).status === 'watched' ? 'Watched' :
           (movie as any).status === 'favorites' ? 'Favorites' :
           (movie as any).status === 'watchlist' ? 'Watchlist' :
           (movie as any).watched ? 'Watched' : 'Watchlist'}
        </Badge>
      </CardFooter>
    </Card>
  )

  if (readonly) {
    return cardContent
  }

  return <Link href={`/movie/${movie.id}`}>{cardContent}</Link>
}

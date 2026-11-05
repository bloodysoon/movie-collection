'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { ShareButton } from '@/components/share-button'

export function Navigation() {
  const { user, loading, signOut } = useAuth()

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            🎬 Movie Tracker
          </Link>
          <div className="flex gap-4">
            <Link href="/">
              <Button variant="ghost">Movies</Button>
            </Link>
            {loading ? (
              <Button variant="ghost" disabled>Loading...</Button>
            ) : user ? (
              <>
                <Link href="/add">
                  <Button>Add Movie</Button>
                </Link>
                <ShareButton />
                <Button variant="outline" onClick={signOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button>Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

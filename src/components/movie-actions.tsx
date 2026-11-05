'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/auth-context'

interface MovieActionsProps {
  movieId: number
}

export function MovieActions({ movieId }: MovieActionsProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('movies')
        .delete()
        .eq('id', movieId)
        .eq('user_id', user.id)

      if (error) throw error

      router.push('/')
    } catch (error) {
      console.error('Error deleting movie:', error)
      alert('Failed to delete movie')
    } finally {
      setLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.push(`/edit/${movieId}`)}>
          Edit
        </Button>
        <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
          Delete
        </Button>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Movie</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this movie? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

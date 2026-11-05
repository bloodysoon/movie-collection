'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'

export function ShareButton() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [shareToken, setShareToken] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleOpen = async () => {
    setOpen(true)
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('share_token')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      setShareToken(data.share_token)
    } catch (error) {
      console.error('Error fetching share token:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    const shareUrl = `${window.location.origin}/share/${shareToken}`
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareUrl = shareToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${shareToken}` : ''

  return (
    <>
      <Button variant="outline" onClick={handleOpen}>
        Share Collection
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Your Collection</DialogTitle>
            <DialogDescription>
              Share your movie collection with others using this link. Anyone with the link can view your collection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loading ? (
              <p>Loading...</p>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Share Link
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="flex-1"
                    />
                    <Button onClick={handleCopy} disabled={copied}>
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This link gives read-only access to your movie collection.
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

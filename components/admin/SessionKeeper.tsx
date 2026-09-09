'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Keeps the CMS session alive while someone is working.
 *
 * Supabase access tokens are short-lived. Instantiating the browser client
 * starts its own refresh timer, which writes the rotated cookies from the
 * client — so a long editing session does not get bounced to the sign-in
 * screen mid-recipe, with or without the server-side proxy.
 *
 * It also reacts to sign-out and token-refresh events: if the session
 * disappears in another tab, this tab re-renders and the server-side
 * `requireAdmin()` sends it to sign in rather than leaving a dead form.
 */
export function SessionKeeper() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // TOKEN_REFRESHED is the common case and needs no re-render; a
      // disappearing session does.
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return null
}

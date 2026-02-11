"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useSession } from "@/lib/auth-client"

type Session = ReturnType<typeof useSession>["data"]
type User = NonNullable<Session>["user"]

interface AuthContextValue {
  session: Session
  user: User | undefined
  isPending: boolean
  isAuthModalOpen: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
  requireAuth: (action: () => void) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const pendingActionRef = useRef<(() => void) | null>(null)

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), [])
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), [])

  // Execute deferred action once session resolves
  useEffect(() => {
    if (!isPending && pendingActionRef.current) {
      const action = pendingActionRef.current
      pendingActionRef.current = null
      if (session?.user) {
        action()
      } else {
        // Schedule modal open outside the effect to avoid cascading renders
        requestAnimationFrame(() => setIsAuthModalOpen(true))
      }
    }
  }, [isPending, session])

  const requireAuth = useCallback(
    (action: () => void) => {
      if (isPending) {
        // Session still loading — defer until resolved
        pendingActionRef.current = action
        return
      }
      if (session?.user) {
        action()
      } else {
        setIsAuthModalOpen(true)
      }
    },
    [session, isPending]
  )

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user,
        isPending,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        requireAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

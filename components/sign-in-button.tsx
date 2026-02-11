"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";

export function SignInButton() {
  const { openAuthModal } = useAuth();

  return (
    <Button variant="outline" size="sm" onClick={openAuthModal}>
      Sign In
    </Button>
  );
}

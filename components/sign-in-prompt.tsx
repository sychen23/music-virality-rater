"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";

interface SignInPromptProps {
  title: string;
  description: string;
}

export function SignInPrompt({ title, description }: SignInPromptProps) {
  const { openAuthModal } = useAuth();

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-lg font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button onClick={openAuthModal} className="mt-2">
        Sign In
      </Button>
    </div>
  );
}

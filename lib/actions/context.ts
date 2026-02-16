"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ensureProfile } from "@/lib/queries/profiles";

export async function getUserProfileData() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const profile = await ensureProfile(session.user.id, session.user.name);
  if (!profile) throw new Error("Profile not found");

  return { credits: profile.credits };
}

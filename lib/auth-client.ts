import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient();

export const signIn = async () => {
  const data = await authClient.signIn.social({
    provider: "google",
    callbackURL: "/upload",
  });
  return data;
};

export const signOut = async () => {
  await authClient.signOut();
};

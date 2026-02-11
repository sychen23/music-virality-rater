import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient();

export const signIn = async (callbackURL: string = "/upload") => {
  const data = await authClient.signIn.social({
    provider: "google",
    callbackURL,
  });
  return data;
};

export const signOut = async () => {
  await authClient.signOut();
};

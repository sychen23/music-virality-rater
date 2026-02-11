import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getProfile, getTracksByUser, ensureProfile } from "@/lib/queries/profiles";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EarnProgressBar } from "@/components/earn-progress-bar";
import { ProfileTracks } from "./profile-tracks";
import { LogoutButton } from "./logout-button";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { page: pageStr } = await searchParams;
  const parsed = parseInt(pageStr || "1", 10);
  const page = Number.isNaN(parsed) ? 1 : Math.max(1, parsed);

  await ensureProfile(session.user.id, session.user.name);
  const profile = await getProfile(session.user.id);
  const trackData = await getTracksByUser(session.user.id, page);

  if (!profile) redirect("/login");

  const initials = (session.user.name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Avatar + Info */}
      <div className="mb-6 flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary text-lg text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-bold">{session.user.name}</h1>
          <p className="text-sm text-muted-foreground">@{profile.handle}</p>
          <p className="text-xs text-muted-foreground">
            Member since {profile.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Credits", value: profile.credits },
          { label: "Uploaded", value: profile.tracksUploaded },
          { label: "Rated", value: profile.tracksRated },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border p-3 text-center"
          >
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Earn progress */}
      <div className="mb-6">
        <EarnProgressBar ratingProgress={profile.ratingProgress} />
      </div>

      {/* My Tracks */}
      <div className="mb-6">
        <h2 className="mb-3 font-semibold">My Tracks</h2>
        <ProfileTracks
          tracks={trackData.tracks.map((t) => ({
            id: t.id,
            title: t.title,
            contextId: t.contextId,
            status: t.status,
            votesReceived: t.votesReceived,
            votesRequested: t.votesRequested,
            overallScore: t.overallScore,
            percentile: t.percentile,
            shareToken: t.shareToken,
          }))}
          page={trackData.page}
          perPage={trackData.perPage}
          totalPages={trackData.totalPages}
          total={trackData.total}
        />
      </div>

      {/* Settings */}
      <div className="border-t border-border pt-4">
        <h2 className="mb-3 font-semibold">Settings</h2>
        <LogoutButton />
      </div>
    </div>
  );
}

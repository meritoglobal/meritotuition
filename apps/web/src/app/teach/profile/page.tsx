import { DATA_LIVE } from "@/lib/data";
import { getUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/batches";
import { MAX_VIDEO_MB, UPLOADS_ON, myVideo } from "@/lib/growth/intro-video";
import ProfileForm from "./ProfileForm";
import IntroVideoForm from "./IntroVideoForm";

export default async function ProfilePage() {
  if (!DATA_LIVE) return null; // the layout shows the setup note
  const u = (await getUser())!;
  const profile = await getProfile(u.id);
  return (
    <>
      <ProfileForm initial={profile} />
      {/* The video needs a saved profile row first. */}
      {profile && <IntroVideoForm userId={u.id} initial={await myVideo(u.id)} uploads={UPLOADS_ON} maxMb={MAX_VIDEO_MB} />}
    </>
  );
}

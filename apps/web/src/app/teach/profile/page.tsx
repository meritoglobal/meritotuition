import { DATA_LIVE } from "@/lib/data";
import { getUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/batches";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  if (!DATA_LIVE) return null; // the layout shows the setup note
  const u = (await getUser())!;
  return <ProfileForm initial={await getProfile(u.id)} />;
}

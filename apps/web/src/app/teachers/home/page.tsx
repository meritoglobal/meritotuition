import { HomeSearch } from "../SearchClient";

export default async function HomeTeachersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return <HomeSearch subjects={sp.subjects} level={sp.level} area={sp.area} />;
}

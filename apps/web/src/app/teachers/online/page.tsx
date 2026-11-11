import { OnlineSearch } from "../SearchClient";

export default async function OnlineTeachersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return <OnlineSearch subjects={sp.subjects} level={sp.level} time={sp.time} batch={sp.batch} />;
}

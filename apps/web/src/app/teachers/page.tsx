import SearchClient from "./SearchClient";

export default async function TeachersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return <SearchClient subjects={sp.subjects} level={sp.level} mode={sp.mode} area={sp.area} />;
}

import ClassRoom from "./ClassRoom";

export default async function ClassPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as } = await searchParams;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <ClassRoom title="Physics · Class 9-10 · 1:3 batch" teacher="Rafiul Hasan" role={as === "teacher" ? "teacher" : "student"} />
    </div>
  );
}

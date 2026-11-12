import ExamView from "@/components/class/ExamView";

export default async function ExamPage({ params, searchParams }: { params: Promise<{ examId: string }>; searchParams: Promise<{ as?: string }> }) {
  const { examId } = await params;
  const { as } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ExamView examId={examId} role={as === "teacher" ? "teacher" : "student"} />
    </div>
  );
}

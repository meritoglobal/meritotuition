import ExamBuilder from "@/components/class/ExamBuilder";

export default async function NewExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ExamBuilder classId={id} />
    </div>
  );
}

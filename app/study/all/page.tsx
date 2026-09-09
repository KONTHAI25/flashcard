import { StudySession } from "@/components/study/StudySession";

export default async function StudyAllPage({ searchParams }: { searchParams: Promise<{ mode?: string | string[] }> }) {
  const { mode } = await searchParams;
  const initialMode = mode === "all" ? "all" : "due";
  return <StudySession key={initialMode} initialMode={initialMode} />;
}

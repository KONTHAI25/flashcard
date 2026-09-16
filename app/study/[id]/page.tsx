import { StudySession } from "@/components/study/StudySession";
import type { StudyMode } from "@/lib/study-queue";

const MODES: StudyMode[] = ["continue", "learning", "all", "due"];

export default async function StudyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string | string[] }>;
}) {
  const { id } = await params;
  const { mode } = await searchParams;
  const requested = Array.isArray(mode) ? mode[0] : mode;
  const initialMode = MODES.includes(requested as StudyMode) ? (requested as StudyMode) : "continue";
  return <StudySession key={`${id}:${initialMode}`} id={id} initialMode={initialMode} />;
}

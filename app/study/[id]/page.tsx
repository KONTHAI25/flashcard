"use client";

import { use } from "react";
import { StudySession } from "@/components/study/StudySession";

export default function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StudySession key={id} id={id} />;
}

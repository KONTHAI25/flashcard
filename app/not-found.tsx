import Link from "next/link";
import { Button } from "@/components/Button";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">This set or page does not exist or was deleted.</p>
      <div className="mt-6">
        <Link href="/"><Button>Back to library</Button></Link>
      </div>
    </div>
  );
}

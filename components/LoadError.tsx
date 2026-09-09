import { Button } from "./Button";

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="rounded-xl border border-red-200 bg-white p-6">
    <h1 className="text-lg font-semibold">Unable to load your flashcards</h1>
    <p className="mb-4 mt-2 text-sm text-slate-600">{message}</p>
    <Button onClick={onRetry}>Try again</Button>
  </div>;
}

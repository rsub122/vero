import { Badge } from "@/components/ui/badge";

interface Counts {
  total: number;
  needCall: number;
  confirmed: number;
  inProgress: number;
}

export function CounterLine({ counts }: { counts: Counts }) {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-live="polite">
      <p className="text-lg tracking-tight">
        <span className="font-semibold tabular-nums">{counts.total}</span> applicants.{" "}
        <span className="font-semibold text-amber-700 tabular-nums dark:text-amber-300">{counts.needCall}</span> need a
        call. <span className="font-semibold tabular-nums">{counts.confirmed}</span> confirmed.
      </p>
      {counts.inProgress > 0 && (
        <Badge variant="secondary" className="tabular-nums">
          {counts.inProgress} in progress
        </Badge>
      )}
    </div>
  );
}

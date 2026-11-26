import { ChanFlower } from "@/components/invitation/ornaments";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-maroon text-[#E8C987] shadow-[inset_0_0_0_1px_rgba(232,201,135,.35)]">
        <ChanFlower size={24} />
      </span>
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="text-[17px] font-bold" lang="km" style={{ lineHeight: 1.3 }}>ធៀបអនឡាញ</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Theab Online</span>
        </span>
      ) : null}
    </span>
  );
}

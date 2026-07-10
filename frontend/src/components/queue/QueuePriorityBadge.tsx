import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Priority } from "@/lib/queueHelpers";
import { getPriorityStyle } from "@/lib/queueHelpers";

interface QueuePriorityBadgeProps {
  priority: Priority;
  /** 傳入時 badge 變為可點擊，點擊後循環切換優先度 */
  onClick?: () => void;
}

const PRIORITY_NEXT: Record<Priority, string> = {
  HIGH: "點擊切換為 MED",
  MED: "點擊切換為 LOW",
  LOW: "點擊切換為 HIGH",
};

export const QueuePriorityBadge = ({
  priority,
  onClick,
}: QueuePriorityBadgeProps) => {
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm tracking-widest border select-none",
        getPriorityStyle(priority),
      )}
    >
      {priority}
    </Badge>
  );

  // 有 onClick 時用 <button> 包住，避免型別衝突
  if (onClick) {
    return (
      <button
        type="button"
        title={PRIORITY_NEXT[priority]}
        onClick={onClick}
        className="cursor-pointer hover:brightness-125 hover:scale-105 active:scale-95 transition-all duration-150 rounded-sm"
      >
        {badge}
      </button>
    );
  }

  return badge;
};

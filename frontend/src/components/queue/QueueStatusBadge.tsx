import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/queueHelpers";
import { getStatusStyle } from "@/lib/queueHelpers";

interface QueueStatusBadgeProps {
  status: TaskStatus;
}

export const QueueStatusBadge = ({ status }: QueueStatusBadgeProps) => {
  const isRunning = status === "RUNNING";

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-sm flex items-center gap-1.5 border w-fit",
        getStatusStyle(status)
      )}
    >
      {/* RUNNING 閃爍點 */}
      {isRunning && (
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
      )}
      {status}
    </Badge>
  );
};

import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
} from "lucide-react";

export const Cards = () => {
  const card = [
    { key: "total", label: "總任務數", value: 0, icon: "total" },
    { key: "success", label: "執行成功", value: 0, icon: "success" },
    { key: "fail", label: "執行失敗", value: 0, icon: "fail" },
    { key: "running", label: "執行中", value: 0, icon: "running" },
    { key: "line", label: "Line通知狀態", value: "Active", icon: "line" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {card.map((item) => (
        <div
          key={item.key}
          className="border border-cyan-300/40 bg-background/40 hover:border-cyan-300/70 rounded-xl p-4 transition-all duration-300"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-cyan-900/30 flex items-center justify-center">
              {item.icon === "total" && (
                <Activity className="w-5 h-5 text-cyan-400" />
              )}
              {item.icon === "success" && (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              )}
              {item.icon === "fail" && (
                <XCircle className="w-5 h-5 text-rose-400" />
              )}
              {item.icon === "running" && (
                <Clock className="w-5 h-5 text-amber-400" />
              )}
              {item.icon === "line" && (
                <MessageSquare className="w-5 h-5 text-emerald-400 animate-pulse" />
              )}
            </div>
            <div className="flex flex-1 flex-col items-center justify-center">
              <p className="text-base text-slate-400 uppercase font-bold">
                {item.label}
              </p>
              <p
                className={`text-2xl font-mono ${
                  item.key === "line"
                    ? "text-emerald-400 font-semibold flex items-center gap-2"
                    : "text-slate-100"
                }`}
              >
                {item.key === "line" && (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                )}
                {item.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

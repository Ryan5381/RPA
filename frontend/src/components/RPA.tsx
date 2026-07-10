import { useState } from "react";
import { Navbar } from "@/components/common/Navbar";
import { Sidebar } from "@/components/common/Sidebar";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { Workflows } from "@/components/workflows/Workflows";
import { Queue } from "@/components/queue/Queue";

export const RPA = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen dark bg-background text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 self-start p-6 md:p-8">
          {activeTab === "dashboard" && <Dashboard />}
          {activeTab === "workflows" && <Workflows />}
          {activeTab === "queue" && <Queue />}
          {activeTab === "logs" && (
            <div className="text-slate-400">日誌終端元件開發中...</div>
          )}
          {activeTab === "settings" && (
            <div className="text-slate-400">設定頁面元件開發中...</div>
          )}
        </main>
      </div>
    </div>
  );
};

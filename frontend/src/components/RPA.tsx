import { useState } from "react";
import { Navbar } from "@/components/common/Navbar";
import { Sidebar } from "@/components/common/Sidebar";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const RPA = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen dark bg-background text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6 md:p-8">
          {activeTab === "dashboard" && <Dashboard />}
          {activeTab === "workflows" && (
            <div className="text-slate-400">工作流元件開發中...</div>
          )}
          {activeTab === "queue" && (
            <div className="text-slate-400">優先序列元件開發中...</div>
          )}
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

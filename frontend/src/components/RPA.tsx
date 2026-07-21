import { useState } from "react";
import { Navbar } from "@/components/common/Navbar";
import { Sidebar } from "@/components/common/Sidebar";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { Workflows } from "@/components/workflows/Workflows";
import { Queue } from "@/components/queue/Queue";
import { Logs } from "@/components/logs/Logs";
import { Settings } from "@/components/settings/Settings";
import { useTheme } from "@/hooks/useTheme";

export const RPA = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col ${theme === "dark" ? "dark" : ""}`}>
      <Navbar />
      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6 md:p-8 w-full min-w-0 overflow-x-hidden">
          {activeTab === "dashboard" && <Dashboard />}
          {activeTab === "workflows" && <Workflows />}
          {activeTab === "queue" && <Queue />}
          {activeTab === "logs" && <Logs />}
          {activeTab === "settings" && <Settings />}
        </main>
      </div>
    </div>
  );
};


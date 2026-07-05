import { Navbar } from "@/components/common/Navbar";
import { Sidebar } from "@/components/common/Sidebar";

export const PRA = () => {
  return (
    <div className="min-h-screen dark">
      <Navbar />
      <Sidebar activeTab="true" setActiveTab={() => {}} />
    </div>
  );
};

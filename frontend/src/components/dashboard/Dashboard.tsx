import { Cards } from "./Cards";
import { ActiveProcesses } from "./ActiveProcesses";

export const Dashboard = () => {
  return (
    <div className="space-y-8">
      <Cards />
      <ActiveProcesses />
    </div>
  );
};

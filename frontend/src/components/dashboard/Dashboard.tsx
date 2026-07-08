import { Cards } from "./Cards";
import { ActiveProcesses } from "./ActiveProcesses";
import { LiveTerminal } from "./LiveTerminal";

export const Dashboard = () => {
  return (
    <div className="space-y-8">
      <Cards />
      <ActiveProcesses />
      <LiveTerminal />
    </div>
  );
};


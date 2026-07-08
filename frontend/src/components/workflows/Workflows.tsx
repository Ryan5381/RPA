import { useState } from "react";
import { Cards } from "./Cards";

export const Workflows = () => {
  const [selectedKey, setSelectedKey] = useState("hospital");

  return (
    <div className="space-y-8">
      <Cards selectedKey={selectedKey} onSelect={setSelectedKey} />
    </div>
  );
};

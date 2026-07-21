import React from "react";
import { BadmintonSummaryPanel } from "./panels/BadmintonSummaryPanel";
import { PrioritySelectorPanel } from "./panels/PrioritySelectorPanel";
import { InlineSummaryPanel } from "./panels/InlineSummaryPanel";

interface PreferenceSelectorProps {
  preferences: any[];
  addPreference: () => void;
  removePreference: (id: string) => void;
  updatePreference: (id: string, field: any, value: string) => void;
  isAtMax: boolean;
  handleLaunchTask: () => void;
  isLaunching: boolean;
  selectedKey: string;
  badmintonForm?: any;
  inlineForm?: any;
}

export const PreferenceSelector: React.FC<PreferenceSelectorProps> = ({
  preferences,
  addPreference,
  removePreference,
  updatePreference,
  isAtMax,
  handleLaunchTask,
  isLaunching,
  selectedKey,
  badmintonForm,
  inlineForm,
}) => {
  const isBadminton =
    selectedKey === "gym" ||
    selectedKey === "badminton" ||
    selectedKey === "badminton-booking";
  const isInline = selectedKey === "utensils";

  if (isBadminton) {
    return (
      <BadmintonSummaryPanel
        badmintonForm={badmintonForm}
        handleLaunchTask={handleLaunchTask}
        isLaunching={isLaunching}
      />
    );
  }

  if (isInline) {
    return (
      <InlineSummaryPanel
        inlineForm={inlineForm}
        handleLaunchTask={handleLaunchTask}
        isLaunching={isLaunching}
      />
    );
  }

  return (
    <PrioritySelectorPanel
      preferences={preferences}
      addPreference={addPreference}
      removePreference={removePreference}
      updatePreference={updatePreference}
      isAtMax={isAtMax}
      handleLaunchTask={handleLaunchTask}
      isLaunching={isLaunching}
    />
  );
};

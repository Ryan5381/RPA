import React from "react";
import { BadmintonSummaryPanel } from "./panels/BadmintonSummaryPanel";
import { InlineSummaryPanel } from "./panels/InlineSummaryPanel";
import { HospitalSummaryPanel } from "./panels/HospitalSummaryPanel";
import { TixCraftSummaryPanel } from "./panels/TixCraftSummaryPanel";
import { ThsrSummaryPanel } from "./panels/ThsrSummaryPanel";
import { FlightSummaryPanel } from "./panels/FlightSummaryPanel";

interface PreferenceSelectorProps {
  preferences: any[];
  addPreference: () => void;
  removePreference: (id: string) => void;
  updatePreference: (id: string, field: any, value: string) => void;
  isAtMax: boolean;
  handleLaunchTask: (options?: { priority?: string; scheduledAt?: string }) => void;
  isLaunching: boolean;
  selectedKey: string;
  badmintonForm?: any;
  inlineForm?: any;
  hospitalForm?: any;
  tixCraftForm?: any;
  thsrForm?: any;
  flightForm?: any;
}

export const PreferenceSelector: React.FC<PreferenceSelectorProps> = ({
  handleLaunchTask,
  isLaunching,
  selectedKey,
  badmintonForm,
  inlineForm,
  hospitalForm,
  tixCraftForm,
  thsrForm,
  flightForm,
}) => {
  const isBadminton = selectedKey === "gym" || selectedKey === "badminton" || selectedKey === "badminton-booking";
  const isInline = selectedKey === "utensils";
  const isHospital = selectedKey === "hospital" || selectedKey === "hospital-booking";
  const isTicket = selectedKey === "ticket" || selectedKey === "tixcraft";
  const isThsr = selectedKey === "train";
  const isFlight = selectedKey === "airplane";

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

  if (isHospital) {
    return (
      <HospitalSummaryPanel
        hospitalForm={hospitalForm}
        handleLaunchTask={handleLaunchTask}
        isLaunching={isLaunching}
      />
    );
  }

  if (isTicket) {
    return (
      <TixCraftSummaryPanel
        tixCraftForm={tixCraftForm}
        handleLaunchTask={handleLaunchTask}
        isLaunching={isLaunching}
      />
    );
  }

  if (isThsr) {
    return (
      <ThsrSummaryPanel
        thsrForm={thsrForm}
        handleLaunchTask={handleLaunchTask}
        isLaunching={isLaunching}
      />
    );
  }

  if (isFlight) {
    return (
      <FlightSummaryPanel
        flightForm={flightForm}
        handleLaunchTask={handleLaunchTask}
        isLaunching={isLaunching}
      />
    );
  }

  return null;
};

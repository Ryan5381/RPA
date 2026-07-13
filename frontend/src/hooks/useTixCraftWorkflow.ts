import { useState } from "react";
import type { Preference } from "@/types/type";

const initialState = {
  activity_url: "https://tixcraft.com/activity",
  target_date: "",
  target_area: "特區",
  ticket_count: "2",
  storage_state: "auth/tixcraft_state.json",
};

export const useTixCraftWorkflow = () => {
  const [tixCraftForm, setTixCraftForm] = useState(initialState);

  const setTixCraftField = (field: keyof typeof tixCraftForm, value: string) => {
    setTixCraftForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetTixCraftForm = () => {
    setTixCraftForm(initialState);
  };

  const getLaunchConfig = (preferences: Preference[]) => {
    return {
      taskType: "tixcraft_booking",
      config: {
        activity_url: tixCraftForm.activity_url,
        target_date: tixCraftForm.target_date,
        target_area: tixCraftForm.target_area,
        ticket_count: Number(tixCraftForm.ticket_count),
        storage_state: tixCraftForm.storage_state,
        preferences: preferences.map((p) => ({ date: p.date, time: p.time })),
      },
    };
  };

  return {
    tixCraftForm,
    setTixCraftForm,
    setTixCraftField,
    resetTixCraftForm,
    getLaunchConfig,
  };
};

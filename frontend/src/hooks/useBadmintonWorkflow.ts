import { useState } from "react";
import type { Preference } from "@/types/type";

const initialState = {
  user_id: "",
  password: "",
  capsolver_api_key: "",
  target_date: "2026-07-14",
  target_time_slot: "13",
  target_courts: "羽6,羽8,羽9",
  target_time: "",
  session_count: "2",
};

export const useBadmintonWorkflow = () => {
  const [badmintonForm, setBadmintonForm] = useState(initialState);

  const setBadmintonField = (field: keyof typeof badmintonForm, value: string) => {
    setBadmintonForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetBadmintonForm = () => {
    setBadmintonForm(initialState);
  };

  const getLaunchConfig = (preferences: Preference[]) => {
    return {
      taskType: "badminton_booking",
      config: {
        user_id: badmintonForm.user_id,
        password: badmintonForm.password,
        capsolver_api_key: badmintonForm.capsolver_api_key,
        target_date: badmintonForm.target_date,
        target_time_slot: badmintonForm.target_time_slot,
        target_courts: badmintonForm.target_courts,
        target_time: badmintonForm.target_time,
        session_count: parseInt(badmintonForm.session_count) || 2,
        preferences: preferences.map((p) => ({ date: p.date, time: p.time })),
      },
    };
  };

  return { badmintonForm, setBadmintonForm, setBadmintonField, resetBadmintonForm, getLaunchConfig };
};

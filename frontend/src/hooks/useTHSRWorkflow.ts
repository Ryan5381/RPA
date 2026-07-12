import { useState } from "react";
import type { Preference } from "@/types/type";

const initialState = {
  from: "台中",
  to: "台北",
  date: "",
  time: "11:00",
  count: "1",
  user_id: "",
  user_phone: "",
};

export const useTHSRWorkflow = () => {
  const [thsrForm, setThsrForm] = useState(initialState);

  const setThsrField = (field: keyof typeof thsrForm, value: string) => {
    setThsrForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetThsrForm = () => {
    setThsrForm(initialState);
  };

  const getLaunchConfig = (preferences: Preference[]) => {
    // 若使用者未填日期，自動用5天後
    const dateValue =
      thsrForm.date ||
      (() => {
        const d = new Date();
        d.setDate(d.getDate() + 5);
        return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}/${String(d.getDate()).padStart(2, "0")}`;
      })();

    return {
      taskType: "thsr_booking",
      config: {
        from: thsrForm.from,
        to: thsrForm.to,
        date: dateValue,
        time: thsrForm.time,
        count: Number(thsrForm.count),
        user_id: thsrForm.user_id,
        user_phone: thsrForm.user_phone,
        preferences: preferences.map((p) => ({ date: p.date, time: p.time })),
      },
    };
  };

  return { thsrForm, setThsrForm, setThsrField, resetThsrForm, getLaunchConfig };
};

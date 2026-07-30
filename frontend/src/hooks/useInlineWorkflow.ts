import { useState } from "react";
import type { InlineBookingForm } from "@/types/type";

// ── 餐廳資料庫（前端用）────────────────────────────────────────────────────────
export const INLINE_RESTAURANTS = [
  {
    key: "islandbuffet",
    name: "島語自助餐廳",
    branches: [
      { key: "taichung_hanshin", name: "台中漢神洲際店" },
      { key: "taipei_hanlai", name: "台北漢來店" },
      { key: "kaohsiung_hanshin", name: "高雄漢神店" },
      { key: "taoyuan_taomall", name: "桃園台茂店" },
    ],
  },
  {
    key: "wuma",
    name: "屋馬燒肉",
    branches: [
      { key: "wenxin", name: "屋馬文心店" },
      { key: "zhonggang", name: "屋馬中港店" },
      { key: "guoan", name: "屋馬國安店" },
      { key: "chongde", name: "屋馬崇德店" },
      { key: "zhongyou", name: "屋馬中友店" },
    ],
  },
  // 預留位置：未來可加入更多餐廳
  // { key: "restaurant_b", name: "某某餐廳", branches: [...] },
];

const initialState: InlineBookingForm = {
  restaurant_key: "islandbuffet",
  branch_key: "taichung_hanshin",
  table_type: "",
  target_date: "",
  session: "evening",
  adults: "2",
  kids: "0",
  last_name: "",
  first_name: "",
  gender: "小姐",
  phone: "",
  email: "",
  purpose: "",
};

export const useInlineWorkflow = () => {
  const [inlineForm, setInlineForm] = useState<InlineBookingForm>(initialState);

  const setInlineField = (field: keyof InlineBookingForm, value: string) => {
    setInlineForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetInlineForm = () => {
    setInlineForm(initialState);
  };

  /** 取得目前選擇的餐廳的分店列表 */
  const getCurrentBranches = () => {
    const restaurant = INLINE_RESTAURANTS.find(
      (r) => r.key === inlineForm.restaurant_key,
    );
    return restaurant?.branches ?? [];
  };

  const getLaunchConfig = () => {
    return {
      taskType: "inline_booking",
      config: {
        restaurant_key: inlineForm.restaurant_key,
        branch_key: inlineForm.branch_key,
        table_type: inlineForm.table_type,
        target_date: inlineForm.target_date,
        session: inlineForm.session,
        adults: Number(inlineForm.adults),
        kids: Number(inlineForm.kids),
        last_name: inlineForm.last_name,
        first_name: inlineForm.first_name,
        gender: inlineForm.gender,
        phone: inlineForm.phone,
        email: inlineForm.email,
        purpose: inlineForm.purpose,
      },
    };
  };

  return {
    inlineForm,
    setInlineForm,
    setInlineField,
    resetInlineForm,
    getCurrentBranches,
    getLaunchConfig,
  };
};

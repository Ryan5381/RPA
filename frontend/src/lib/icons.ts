import {
  Hospital,
  Ticket,
  Utensils,
  PlaneTakeoff,
  Dumbbell,
  Train,
  NotepadText,
  TentTree,
} from "lucide-react";

// 圖示映射字典：將 JSON 或任務類型對應至真實的 Lucide 圖示元件
export const ICON_MAP: Record<string, React.ElementType> = {
  hospital: Hospital,
  hospital_booking: Hospital,
  ticket: Ticket,
  tixcraft_booking: Ticket,
  concert_ticket: Ticket,
  utensils: Utensils,
  inline_booking: Utensils,
  airplane: PlaneTakeoff,
  gym: Dumbbell,
  badminton: Dumbbell,
  badminton_booking: Dumbbell,
  train: Train,
  thsr_booking: Train,
  school: NotepadText,
  camping: TentTree,
};

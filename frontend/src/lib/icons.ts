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

// 圖示映射字典：將 JSON 中的字串對應至真實的 Lucide 圖示元件
export const ICON_MAP: Record<string, React.ElementType> = {
  hospital: Hospital,
  ticket: Ticket,
  utensils: Utensils,
  airplane: PlaneTakeoff,
  gym: Dumbbell,
  train: Train,
  school: NotepadText,
  camping: TentTree,
};

import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UtensilsCrossed, CalendarDays, Users, Phone, ShieldAlert } from "lucide-react";
import type { InlineBookingForm, InlineGender, InlineSession, InlinePurpose } from "@/types/type";
import { INLINE_RESTAURANTS } from "@/hooks/useInlineWorkflow";

interface InlineFormProps {
  inlineForm: InlineBookingForm;
  setInlineField: (field: keyof InlineBookingForm, value: string) => void;
  inputClass: string;
}

const SESSION_OPTIONS: { value: InlineSession; label: string }[] = [
  { value: "midday", label: "午餐（11:30 – 14:00）" },
  { value: "afternoon", label: "下午茶（14:30 – 17:00）" },
  { value: "evening", label: "晚餐（17:30 起）" },
];

const PURPOSE_OPTIONS: { value: InlinePurpose; label: string }[] = [
  { value: "", label: "不指定" },
  { value: "birthday", label: "慶生" },
  { value: "date", label: "約會" },
  { value: "anniversary", label: "週年慶" },
  { value: "family", label: "家庭用餐" },
  { value: "friends", label: "朋友聚餐" },
  { value: "business", label: "商務聚餐" },
];

const GENDER_OPTIONS: { value: InlineGender; label: string }[] = [
  { value: "小姐", label: "小姐" },
  { value: "先生", label: "先生" },
  { value: "其他", label: "其他" },
];

const selectClass =
  "w-full h-9 border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-slate-300 text-xs focus:border-cyan-500/60";

export const InlineForm: React.FC<InlineFormProps> = ({
  inlineForm,
  setInlineField,
  inputClass,
}) => {
  // 取得目前選擇餐廳的分店列表
  const currentRestaurant = INLINE_RESTAURANTS.find(
    (r) => r.key === inlineForm.restaurant_key
  );
  const branches = currentRestaurant?.branches ?? [];

  return (
    <div className="space-y-5 pt-1">

      {/* ── 區塊一：餐廳與分店 ── */}
      <div className="space-y-3">
        <p className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <UtensilsCrossed className="w-3 h-3 text-orange-500 dark:text-orange-400" />
          餐廳與分店
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* 餐廳選擇 */}
          <div className="space-y-1.5">
            <Label htmlFor="restaurant_key" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
              餐廳品牌
            </Label>
            <Select
              value={inlineForm.restaurant_key}
              onValueChange={(v) => {
                setInlineField("restaurant_key", v);
                // 切換餐廳時，重設分店為第一個
                const restaurant = INLINE_RESTAURANTS.find((r) => r.key === v);
                if (restaurant?.branches[0]) {
                  setInlineField("branch_key", restaurant.branches[0].key);
                }
              }}
            >
              <SelectTrigger className={selectClass}>
                <SelectValue placeholder="選擇餐廳" />
              </SelectTrigger>
              <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
                {INLINE_RESTAURANTS.map((r) => (
                  <SelectItem key={r.key} value={r.key} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 分店選擇 */}
          <div className="space-y-1.5">
            <Label htmlFor="branch_key" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
              分店
            </Label>
            <Select
              value={inlineForm.branch_key}
              onValueChange={(v) => setInlineField("branch_key", v)}
            >
              <SelectTrigger className={selectClass}>
                <SelectValue placeholder="選擇分店" />
              </SelectTrigger>
              <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
                {branches.map((b) => (
                  <SelectItem key={b.key} value={b.key} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── 區塊二：日期、時段、人數 ── */}
      <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800/60">
        <p className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <CalendarDays className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
          訂位時間與人數
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* 日期 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">訂位日期</Label>
            <DatePicker
              selected={(() => {
                if (!inlineForm.target_date) return null;
                const d = new Date(inlineForm.target_date);
                return isNaN(d.getTime()) ? null : d;
              })()}
              onChange={(date: Date | null) => {
                if (date) {
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, "0");
                  const dd = String(date.getDate()).padStart(2, "0");
                  setInlineField("target_date", `${yyyy}-${mm}-${dd}` as string);
                } else {
                  setInlineField("target_date", "" as string);
                }
              }}
              dateFormat="yyyy/MM/dd"
              minDate={new Date()}
              wrapperClassName="w-full block"
              className={`${inputClass} w-full`}
              placeholderText="選擇訂位日期"
              isClearable
            />
          </div>

          {/* 時段 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">用餐時段</Label>
            <Select
              value={inlineForm.session}
              onValueChange={(v) => setInlineField("session", v as InlineSession)}
            >
              <SelectTrigger className={selectClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
                {SESSION_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* 大人人數 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium flex items-center gap-1">
              <Users className="w-3 h-3" /> 大人人數
            </Label>
            <Select
              value={inlineForm.adults}
              onValueChange={(v) => setInlineField("adults", v)}
            >
              <SelectTrigger className={selectClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
                {["1", "2", "3", "4", "5", "6", "7"].map((n) => (
                  <SelectItem key={n} value={n} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                    {n} 位
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 小孩人數 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">小孩人數</Label>
            <Select
              value={inlineForm.kids}
              onValueChange={(v) => setInlineField("kids", v)}
            >
              <SelectTrigger className={selectClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
                {["0", "1", "2", "3", "4", "5"].map((n) => (
                  <SelectItem key={n} value={n} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                    {n} 位
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── 區塊三：聯絡資訊 ── */}
      <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800/60">
        <p className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Phone className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
          聯絡資訊
        </p>

        {/* 姓名 + 稱謂 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="last_name" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">姓</Label>
            <Input
              id="last_name"
              placeholder="姓"
              value={inlineForm.last_name}
              onChange={(e) => setInlineField("last_name", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="first_name" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">名</Label>
            <Input
              id="first_name"
              placeholder="名"
              value={inlineForm.first_name}
              onChange={(e) => setInlineField("first_name", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">稱謂</Label>
            <Select
              value={inlineForm.gender}
              onValueChange={(v) => setInlineField("gender", v as InlineGender)}
            >
              <SelectTrigger className={selectClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
                {GENDER_OPTIONS.map((g) => (
                  <SelectItem key={g.value} value={g.value} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 手機號碼 */}
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
            手機號碼 <span className="text-slate-500 dark:text-slate-600">（將接收 OTP 驗證碼）</span>
          </Label>
          <div className="flex gap-2">
            <div className="flex items-center px-3 h-9 rounded-md border border-slate-300 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-500 text-xs font-mono shrink-0">
              +886
            </div>
            <Input
              id="phone"
              placeholder="09xxxxxxxx"
              value={inlineForm.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setInlineField("phone", val);
              }}
              maxLength={10}
              className={inputClass}
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
            Email <span className="text-slate-500 dark:text-slate-600">（選填）</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="example@email.com"
            value={inlineForm.email}
            onChange={(e) => setInlineField("email", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* ── 區塊四：用餐目的 ── */}
      <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800/60">
        <p className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-widest">
          用餐目的 <span className="text-slate-500 dark:text-slate-600 normal-case font-normal">（選填）</span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {PURPOSE_OPTIONS.filter((p) => p.value !== "").map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() =>
                setInlineField("purpose", inlineForm.purpose === p.value ? "" : p.value as InlinePurpose)
              }
              className={`px-3 py-2 rounded-lg text-xs font-mono border transition-all duration-200 cursor-pointer ${
                inlineForm.purpose === p.value
                  ? "border-orange-500/60 bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 font-bold"
                  : "border-slate-300 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-500 hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-400"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 提示說明 ── */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/30 rounded-lg p-3 text-[11px] text-amber-800 dark:text-amber-300 font-mono space-y-1 flex gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div>
          <div className="font-bold text-amber-900 dark:text-amber-200 mb-1">半自動化模式說明</div>
          <p className="text-amber-700 dark:text-amber-400/80 leading-relaxed">
            機器人將自動完成填表與「按住不放」挑戰。<br />
            手機收到 4 位數 OTP 後，請回到前端「任務序列」頁面輸入驗證碼即可完成訂位。
          </p>
        </div>
      </div>
    </div>
  );
};

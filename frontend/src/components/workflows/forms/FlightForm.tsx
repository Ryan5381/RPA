import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plane, Bell, Calendar as CalendarIcon, ArrowRight, Timer, Luggage } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const POPULAR_AIRPORTS = [
  { code: "TPE", name: "台灣桃園 (TPE)" },
  { code: "TSA", name: "台灣松山 (TSA)" },
  { code: "NRT", name: "日本成田 (NRT)" },
  { code: "HND", name: "日本羽田 (HND)" },
  { code: "KIX", name: "日本關西 (KIX)" },
  { code: "CTS", name: "日本新千歲 (CTS)" },
  { code: "OKA", name: "日本沖繩 (OKA)" },
  { code: "ICN", name: "韓國仁川 (ICN)" },
  { code: "BKK", name: "泰國曼谷 (BKK)" },
  { code: "SIN", name: "新加坡樟宜 (SIN)" },
  { code: "HKG", name: "香港 (HKG)" },
  { code: "MNL", name: "菲律賓馬尼拉 (MNL)" },
  { code: "KUL", name: "馬來西亞吉隆坡 (KUL)" },
  { code: "SGN", name: "越南胡志明 (SGN)" },
  { code: "LAX", name: "美國洛杉磯 (LAX)" },
  { code: "LHR", name: "英國倫敦希斯洛 (LHR)" },
];

interface FlightFormProps {
  flightForm: {
    origin: string;
    destination: string;
    date_from: string;
    date_to: string;
    budget: string;
    cabin: string;
    direct_only: boolean;
    trip_type: string;
    return_date: string;
    platform: string;
    return_type?: string;
    stay_duration?: string;
  };
  setFlightField: (field: any, value: string | boolean) => void;
  inputClass: string;
}

// 日期選擇器元件
const DatePickerButton: React.FC<{
  value: string;
  onChange: (val: string) => void;
  disableBefore?: string;
  placeholder?: string;
}> = ({ value, onChange, disableBefore, placeholder = "選擇日期" }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 預設顯示月份：優先顯示已選日期或限制起始日的月份，避免從今天開始翻
  const defaultMonth = React.useMemo(() => {
    if (value) return new Date(value.replace(/-/g, "/"));
    if (disableBefore) return new Date(disableBefore.replace(/-/g, "/"));
    return today;
  }, [value, disableBefore]);

  // 可選範圍的最早日期
  const fromDate = disableBefore ? new Date(disableBefore.replace(/-/g, "/")) : today;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-9 text-xs px-3",
            "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60",
            "hover:bg-slate-50 dark:hover:bg-slate-800/60",
            "text-slate-900 dark:text-slate-200",
            "transition-colors",
            !value && "text-slate-400 dark:text-slate-500"
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50 shrink-0" />
          <span>{value ? format(new Date(value.replace(/-/g, "/")), "yyyy 年 M 月 d 日") : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={value ? new Date(value.replace(/-/g, "/")) : undefined}
          defaultMonth={defaultMonth}
          startMonth={fromDate}
          endMonth={new Date(today.getFullYear() + 2, 11)}
          onSelect={(date) => {
            if (date) {
              const yyyy = date.getFullYear();
              const mm = String(date.getMonth() + 1).padStart(2, "0");
              const dd = String(date.getDate()).padStart(2, "0");
              onChange(`${yyyy}-${mm}-${dd}`);
            } else {
              onChange("");
            }
          }}
          disabled={(date) => date < fromDate}
          initialFocus
          fixedWeeks={true}
        />
      </PopoverContent>
    </Popover>
  );
};

// 區塊標題元件
const SectionTitle: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="flex items-center gap-1.5 mb-2.5">
    {icon && <span className="text-slate-400 dark:text-slate-500">{icon}</span>}
    <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
      {children}
    </p>
  </div>
);

export const FlightForm: React.FC<FlightFormProps> = ({
  flightForm,
  setFlightField,
  inputClass,
}) => {
  const returnType = flightForm.return_type || "specific_date";

  return (
    <div className="space-y-5 pt-1">

      {/* ── 單程 / 來回 切換 ── */}
      <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-800 gap-1">
        {([{ key: "one_way", label: "✈️ 單程" }, { key: "round_trip", label: "🔁 來回" }]).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFlightField("trip_type", key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              flightForm.trip_type === key
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 平台選擇 + 說明 ── */}
      <div className="rounded-xl border border-sky-200 dark:border-sky-800/50 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20 p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] bg-sky-500 text-white font-bold tracking-wide">
              PRICE WATCHER
            </span>
            <span className="text-xs font-mono font-medium">機票低價監控</span>
            <span className="text-slate-400 dark:text-slate-500 text-xs">·</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">不自動下單</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Bell className="w-3 h-3" />
            低於預算即 LINE 通知
          </span>
        </div>

        {/* 平台選擇 */}
        <div className="flex bg-white/70 dark:bg-slate-900/50 rounded-lg border border-sky-100 dark:border-sky-800/30 p-0.5 gap-0.5">
          {([
            { key: "google", label: "🔍 Google Flights" },
            { key: "trip", label: "🧳 Trip.com（含行李）" }
          ]).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFlightField("platform", key)}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-mono transition-all ${
                flightForm.platform === key
                  ? "bg-sky-500 text-white font-bold shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 航線設定 ── */}
      <div>
        <SectionTitle icon={<Plane className="w-3 h-3" />}>出發地與目的地</SectionTitle>
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">出發機場</Label>
            <Select value={flightForm.origin} onValueChange={(v) => setFlightField("origin", v)}>
              <SelectTrigger className="w-full h-9 border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-200 text-xs">
                <span className="truncate">{POPULAR_AIRPORTS.find((a) => a.code === flightForm.origin)?.name || flightForm.origin}</span>
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 max-h-56">
                {POPULAR_AIRPORTS.map((a) => (
                  <SelectItem key={a.code} value={a.code} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-shrink-0 mt-4">
            <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>

          <div className="flex-1 space-y-1">
            <Label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">目的地機場</Label>
            <Select value={flightForm.destination} onValueChange={(v) => setFlightField("destination", v)}>
              <SelectTrigger className="w-full h-9 border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-200 text-xs">
                <span className="truncate">{POPULAR_AIRPORTS.find((a) => a.code === flightForm.destination)?.name || flightForm.destination}</span>
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 max-h-56">
                {POPULAR_AIRPORTS.map((a) => (
                  <SelectItem key={a.code} value={a.code} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── 搜尋日期區間 ── */}
      <div>
        <SectionTitle icon={<CalendarIcon className="w-3 h-3" />}>搜尋出發日期區間</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <Label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">最早出發日</Label>
            <DatePickerButton
              value={flightForm.date_from}
              onChange={(v) => setFlightField("date_from", v)}
              placeholder="選擇日期"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">最晚出發日</Label>
            <DatePickerButton
              value={flightForm.date_to}
              onChange={(v) => setFlightField("date_to", v)}
              disableBefore={flightForm.date_from || new Date().toISOString().split("T")[0]}
              placeholder="選擇日期"
            />
          </div>
        </div>
      </div>

      {/* ── 回程設定（僅來回票顯示）── */}
      {flightForm.trip_type === "round_trip" && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold uppercase tracking-widest">
              🔁 回程設定
            </Label>
            <Select value={returnType} onValueChange={(v) => setFlightField("return_type", v)}>
              <SelectTrigger className="h-6 px-2 text-[10px] w-auto border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg gap-1">
                <span>{returnType === "stay_duration" ? "⏱ 停留天數" : "📅 指定日期"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stay_duration" className="text-xs">⏱ 按停留天數計算</SelectItem>
                <SelectItem value="specific_date" className="text-xs">📅 指定回程日期</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {returnType === "stay_duration" ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={flightForm.stay_duration || "5"}
                  onChange={(e) => setFlightField("stay_duration", e.target.value)}
                  className={cn(inputClass, "text-center w-20 flex-shrink-0")}
                  placeholder="5"
                  min="1"
                  max="365"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">天</span>
              </div>
              {/* 直觀預覽：出發日 + 天數 = 回程日 */}
              {flightForm.date_from && flightForm.stay_duration ? (() => {
                try {
                  const dep = new Date(flightForm.date_from.replace(/-/g, "/"));
                  const ret = new Date(dep);
                  ret.setDate(ret.getDate() + Number(flightForm.stay_duration));
                  const fmt = (d: Date) => `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
                  return (
                    <p className="text-[10px] text-sky-600 dark:text-sky-400 font-mono bg-sky-50 dark:bg-sky-950/30 rounded-lg px-2 py-1.5 border border-sky-200 dark:border-sky-800/40">
                      📅 例如：{fmt(dep)} 出發 → 停留 {flightForm.stay_duration} 天 → {fmt(ret)} 回程
                    </p>
                  );
                } catch { return null; }
              })() : (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  請先設定最早出發日，此處將自動計算每日對應的回程日期
                </p>
              )}
            </div>
          ) : (
            <DatePickerButton
              value={flightForm.return_date}
              onChange={(v) => setFlightField("return_date", v)}
              disableBefore={flightForm.date_from || new Date().toISOString().split("T")[0]}
              placeholder="選擇回程日期"
            />
          )}
        </div>
      )}

      {/* ── 預算與艙等 ── */}
      <div>
        <SectionTitle icon={<Bell className="w-3 h-3" />}>通知條件</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <Label htmlFor="flight-budget" className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              預算上限（NT$）
            </Label>
            <Input
              id="flight-budget"
              type="number"
              placeholder="10000"
              value={flightForm.budget}
              onChange={(e) => setFlightField("budget", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">艙等</Label>
            <Select value={flightForm.cabin} onValueChange={(v) => setFlightField("cabin", v)}>
              <SelectTrigger className="w-full h-9 border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-200 text-xs">
                <span>{flightForm.cabin === "business" ? "🛋️ 商務艙" : "💺 經濟艙"}</span>
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
                <SelectItem value="economy" className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">💺 經濟艙</SelectItem>
                <SelectItem value="business" className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">🛋️ 商務艙</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── 直飛開關 ── */}
      <div
        onClick={() => setFlightField("direct_only", !flightForm.direct_only)}
        className={`flex items-center justify-between rounded-xl px-3 py-2.5 border cursor-pointer select-none transition-all ${
          flightForm.direct_only
            ? "border-sky-400/60 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300"
            : "border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
        }`}
      >
        <div className="flex items-center gap-2">
          <Plane className={`w-3.5 h-3.5 ${flightForm.direct_only ? "text-sky-500" : "text-slate-400"}`} />
          <span className="text-xs font-mono font-medium">直飛限定（不含轉機）</span>
        </div>
        <div className={`w-9 h-5 rounded-full transition-all relative flex-shrink-0 ${flightForm.direct_only ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-600"}`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${flightForm.direct_only ? "left-4" : "left-0.5"}`} />
        </div>
      </div>

    </div>
  );
};

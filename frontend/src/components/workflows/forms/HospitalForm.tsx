import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SensitiveInput } from "@/components/common/SensitiveInput";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HOSPITALS,
  HOSPITAL_DEPARTMENTS,
} from "@/lib/constants/hospitalColumns";

interface HospitalFormProps {
  hospitalForm: {
    hospital: string;
    department: string;
    targetDate?: string;
    patientType?: string;
    userName?: string;
    user_id: string;
    birthDate: string;
    user_phone: string;
    doctorName: string;
    fallback_options: { date: string; doctorName: string }[];
  };
  setHospitalForm?: React.Dispatch<
    React.SetStateAction<{
      hospital: string;
      department: string;
      targetDate?: string;
      patientType?: string;
      userName?: string;
      user_id: string;
      birthDate: string;
      user_phone: string;
      doctorName: string;
      fallback_options: { date: string; doctorName: string }[];
    }>
  >;
  inputClass: string;
}

export const HospitalForm: React.FC<HospitalFormProps> = ({
  hospitalForm,
  setHospitalForm,
  inputClass,
}) => {
  if (!setHospitalForm) return null;

  const setHospitalField = (
    field: keyof typeof hospitalForm,
    value: any
  ) => {
    setHospitalForm((prev) => {
      // 若切換醫院，自動將科別設為該醫院第一個預設科別
      if (field === "hospital" && value !== prev.hospital) {
        const defaultDept =
          HOSPITAL_DEPARTMENTS[value]?.[0]?.code || "FAM";
        return { ...prev, hospital: value, department: defaultDept };
      }
      return { ...prev, [field]: value };
    });
  };

  const currentDepts =
    HOSPITAL_DEPARTMENTS[hospitalForm.hospital] || HOSPITAL_DEPARTMENTS.NTUH;

  const addFallback = () => {
    setHospitalForm((prev) => ({
      ...prev,
      fallback_options: [...prev.fallback_options, { date: "", doctorName: "" }],
    }));
  };

  const updateFallback = (index: number, field: "date" | "doctorName", value: string) => {
    setHospitalForm((prev) => {
      const newOpts = [...prev.fallback_options];
      newOpts[index] = { ...newOpts[index], [field]: value };
      return { ...prev, fallback_options: newOpts };
    });
  };

  const removeFallback = (index: number) => {
    setHospitalForm((prev) => ({
      ...prev,
      fallback_options: prev.fallback_options.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-4 pt-1">
      {/* 醫院自動化掛號標籤 */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/40 rounded-lg p-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-mono">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-400/60 dark:border-emerald-500/30 font-bold">
            智能預約助手
          </span>
          醫療門診自動掛號助理
        </div>
        <span className="text-[10px] text-slate-600 dark:text-slate-500 font-mono">
          支援多順位自動候補
        </span>
      </div>

      {/* 院區與看診科別 */}
      <div className="space-y-3">
        <p className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-widest">
          選擇醫療院所與看診門診
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">醫院據點</Label>
            <Select
              value={hospitalForm.hospital}
              onValueChange={(v) => setHospitalField("hospital", v)}
            >
              <SelectTrigger className="w-full h-9 border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-slate-300 text-xs">
                <span className="truncate">
                  {HOSPITALS.find((h) => h.code === hospitalForm.hospital)?.name || "選擇醫院"}
                </span>
              </SelectTrigger>
              <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
                {HOSPITALS.map((h) => (
                  <SelectItem key={h.code} value={h.code} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">掛號科別</Label>
            <Select
              value={hospitalForm.department}
              onValueChange={(v) => setHospitalField("department", v)}
            >
              <SelectTrigger className="w-full h-9 border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-slate-300 text-xs">
                <span className="truncate">
                  {currentDepts.find((d) => d.code === hospitalForm.department)?.name || "選擇科別"}
                </span>
              </SelectTrigger>
              <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 max-h-56">
                {currentDepts.map((d) => (
                  <SelectItem key={d.code} value={d.code} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 首選日期與醫師 */}
        <div className="bg-slate-50 dark:bg-slate-950/50 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-3 space-y-3 relative">
          <div className="absolute top-0 left-0 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-lg uppercase tracking-wider">
            1st Choice (首選)
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
                預約看診日期
              </Label>
              <DatePicker
                selected={(() => {
                  if (!hospitalForm.targetDate) return null;
                  const d = new Date(hospitalForm.targetDate.replace(/-/g, "/"));
                  return isNaN(d.getTime()) ? null : d;
                })()}
                onChange={(date: Date | null) => {
                  if (date) {
                    const yyyy = date.getFullYear();
                    const mm = String(date.getMonth() + 1).padStart(2, "0");
                    const dd = String(date.getDate()).padStart(2, "0");
                    setHospitalField("targetDate", `${yyyy}-${mm}-${dd}`);
                  } else {
                    setHospitalField("targetDate", "");
                  }
                }}
                dateFormat="yyyy-MM-dd"
                wrapperClassName="w-full block"
                className={`${inputClass} w-full`}
                placeholderText="點選預約日期"
                minDate={new Date()}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hosp-doctor" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
                指定醫師 (可不填)
              </Label>
              <Input
                id="hosp-doctor"
                placeholder="如：王大明"
                value={hospitalForm.doctorName}
                onChange={(e) => setHospitalField("doctorName", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* 候補選項 (Fallback Options) */}
        {hospitalForm.fallback_options.map((opt, idx) => (
          <div key={idx} className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-3 relative group transition-all">
            <div className="absolute top-0 left-0 bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-lg uppercase tracking-wider">
              Fallback {idx + 1} (候補)
            </div>
            <button
              type="button"
              onClick={() => removeFallback(idx)}
              className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
                  候補日期
                </Label>
                <DatePicker
                  selected={(() => {
                    if (!opt.date) return null;
                    const d = new Date(opt.date.replace(/-/g, "/"));
                    return isNaN(d.getTime()) ? null : d;
                  })()}
                  onChange={(date: Date | null) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, "0");
                      const dd = String(date.getDate()).padStart(2, "0");
                      updateFallback(idx, "date", `${yyyy}-${mm}-${dd}`);
                    } else {
                      updateFallback(idx, "date", "");
                    }
                  }}
                  dateFormat="yyyy-MM-dd"
                  wrapperClassName="w-full block"
                  className={`${inputClass} w-full`}
                  placeholderText="點選候補日期"
                  minDate={new Date()}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
                  指定候補醫師
                </Label>
                <Input
                  placeholder="如：李小明"
                  value={opt.doctorName}
                  onChange={(e) => updateFallback(idx, "doctorName", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ))}

        {hospitalForm.fallback_options.length < 3 && (
          <Button
            type="button"
            variant="outline"
            onClick={addFallback}
            className="w-full h-8 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-mono font-semibold gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            新增候補條件
          </Button>
        )}
      </div>

      {/* 病患基本資料卡 */}
      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800/60">
        <p className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-widest">
          看診人身分驗證資訊 (掛號必備)
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">就診身分類別</Label>
            <Select
              value={hospitalForm.patientType || "return"}
              onValueChange={(v) => setHospitalField("patientType", v)}
            >
              <SelectTrigger className="w-full h-9 border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-slate-300 text-xs">
                <span className="truncate">
                  {hospitalForm.patientType === "first_time"
                    ? "初診預約 (首次於本院就診)"
                    : "複診掛號 (已有就診病歷號)"}
                </span>
              </SelectTrigger>
              <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
                <SelectItem value="return" className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                  複診掛號 (已有就診病歷號)
                </SelectItem>
                <SelectItem value="first_time" className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                  初診預約 (首次於本院就診)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="hosp-name"
              className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium"
            >
              看診人真實姓名 {hospitalForm.patientType === "first_time" && "(初診必填)"}
            </Label>
            <Input
              id="hosp-name"
              placeholder="如：王大明"
              value={hospitalForm.userName || ""}
              onChange={(e) => setHospitalField("userName", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="hosp-id" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
              身分證字號 / 居留證號
            </Label>
            <SensitiveInput
              id="hosp-id"
              placeholder="如 A123456789"
              value={hospitalForm.user_id}
              onChange={(e) => setHospitalField("user_id", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hosp-birth" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
              出生年月日 (核驗用)
            </Label>
            <DatePicker
              selected={(() => {
                if (!hospitalForm.birthDate) return null;
                const d = new Date(hospitalForm.birthDate.replace(/-/g, "/"));
                return isNaN(d.getTime()) ? null : d;
              })()}
              onChange={(date: Date | null) => {
                if (date) {
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, "0");
                  const dd = String(date.getDate()).padStart(2, "0");
                  setHospitalField("birthDate", `${yyyy}-${mm}-${dd}`);
                } else {
                  setHospitalField("birthDate", "");
                }
              }}
              dateFormat="yyyy-MM-dd"
              wrapperClassName="w-full block"
              className={`${inputClass} w-full`}
              placeholderText="點選出生日期"
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hosp-phone" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
            看診聯絡簡訊手機
          </Label>
          <SensitiveInput
            id="hosp-phone"
            placeholder="如 0912345678 (確認看診與號碼提醒)"
            value={hospitalForm.user_phone}
            onChange={(e) => setHospitalField("user_phone", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
};

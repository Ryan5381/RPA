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
    value: string
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

  return (
    <div className="space-y-4 pt-1">
      {/* 醫院自動化掛號標籤 */}
      <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-emerald-300 font-mono">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
            智能預約助手
          </span>
          醫療門診自動掛號助理
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          支援台大與長庚雙院區自動名額候補
        </span>
      </div>

      {/* 院區與看診科別 */}
      <div className="space-y-3">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          選擇醫療院所與看診門診
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 font-mono">醫院據點</Label>
            <Select
              value={hospitalForm.hospital}
              onValueChange={(v) => setHospitalField("hospital", v)}
            >
              <SelectTrigger className="w-full h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 text-xs">
                <span className="truncate">
                  {HOSPITALS.find((h) => h.code === hospitalForm.hospital)
                    ?.name || "選擇醫院"}
                </span>
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                {HOSPITALS.map((h) => (
                  <SelectItem
                    key={h.code}
                    value={h.code}
                    className="text-xs focus:bg-slate-800"
                  >
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 font-mono">掛號科別</Label>
            <Select
              value={hospitalForm.department}
              onValueChange={(v) => setHospitalField("department", v)}
            >
              <SelectTrigger className="w-full h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 text-xs">
                <span className="truncate">
                  {currentDepts.find((d) => d.code === hospitalForm.department)
                    ?.name || "選擇科別"}
                </span>
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-300 max-h-56">
                {currentDepts.map((d) => (
                  <SelectItem
                    key={d.code}
                    value={d.code}
                    className="text-xs focus:bg-slate-800"
                  >
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 font-mono">
              預約看診首選日期
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
            <Label
              htmlFor="hosp-doctor"
              className="text-xs text-slate-400 font-mono"
            >
              指定醫師姓名 (可不填)
            </Label>
            <Input
              id="hosp-doctor"
              placeholder="如：王大明 醫師"
              value={hospitalForm.doctorName}
              onChange={(e) => setHospitalField("doctorName", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* 病患基本資料卡 */}
      <div className="space-y-3 pt-2 border-t border-slate-800/60">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          看診人身分驗證資訊 (掛號必備)
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 font-mono">就診身分類別</Label>
            <Select
              value={hospitalForm.patientType || "return"}
              onValueChange={(v) => setHospitalField("patientType", v)}
            >
              <SelectTrigger className="w-full h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 text-xs">
                <span className="truncate">
                  {hospitalForm.patientType === "first_time"
                    ? "初診預約 (首次於本院就診)"
                    : "複診掛號 (已有就診病歷號)"}
                </span>
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                <SelectItem value="return" className="text-xs focus:bg-slate-800">
                  複診掛號 (已有就診病歷號)
                </SelectItem>
                <SelectItem value="first_time" className="text-xs focus:bg-slate-800">
                  初診預約 (首次於本院就診)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="hosp-name"
              className="text-xs text-slate-400 font-mono"
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
            <Label
              htmlFor="hosp-id"
              className="text-xs text-slate-400 font-mono"
            >
              身分證字號 / 居留證號
            </Label>
            <Input
              id="hosp-id"
              placeholder="如 A123456789"
              value={hospitalForm.user_id}
              onChange={(e) => setHospitalField("user_id", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="hosp-birth"
              className="text-xs text-slate-400 font-mono"
            >
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
          <Label
            htmlFor="hosp-phone"
            className="text-xs text-slate-400 font-mono"
          >
            看診聯絡簡訊手機
          </Label>
          <Input
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

import { useState } from "react";
import type { Preference } from "@/types/type";
import { HOSPITAL_DEPARTMENTS } from "@/lib/constants/hospitalColumns";

const initialState = {
  hospital: "NTUH",
  department: "FAM",
  targetDate: new Date().toISOString().split("T")[0],
  patientType: "return", // return: 複診掛號, first_time: 初診預約
  userName: "",
  user_id: "",
  birthDate: "1985-01-01",
  user_phone: "",
  doctorName: "",
};


export const useHospitalWorkflow = () => {
  const [hospitalForm, setHospitalForm] = useState(initialState);

  const setHospitalField = (
    field: keyof typeof hospitalForm,
    value: string
  ) => {
    setHospitalForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetHospitalForm = () => {
    setHospitalForm(initialState);
  };

  const getLaunchConfig = (preferences: Preference[]) => {
    const depts =
      HOSPITAL_DEPARTMENTS[hospitalForm.hospital] || HOSPITAL_DEPARTMENTS.NTUH;
    const matchedDept = depts.find((d) => d.code === hospitalForm.department);
    const deptName = matchedDept ? matchedDept.name : hospitalForm.department;

    return {
      taskType: "hospital_booking",
      config: {
        hospital: hospitalForm.hospital,
        department: hospitalForm.department,
        deptName: deptName,
        targetDate: hospitalForm.targetDate,
        patientType: hospitalForm.patientType,
        userName: hospitalForm.userName,
        user_id: hospitalForm.user_id,
        birthDate: hospitalForm.birthDate,
        user_phone: hospitalForm.user_phone,
        doctorName: hospitalForm.doctorName,
        preferences: preferences.map((p) => ({
          date: p.date,
          time: p.time,
        })),
      },
    };
  };

  return {
    hospitalForm,
    setHospitalForm,
    setHospitalField,
    resetHospitalForm,
    getLaunchConfig,
  };
};

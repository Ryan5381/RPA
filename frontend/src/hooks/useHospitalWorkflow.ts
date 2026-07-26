import { useState } from "react";
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
  fallback_options: [] as { date: string; doctorName: string }[],
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

  const getLaunchConfig = () => {
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
        fallback_options: hospitalForm.fallback_options,
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

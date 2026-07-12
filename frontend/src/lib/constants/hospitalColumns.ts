export interface HospitalOption {
  code: string;
  name: string;
}

export interface DepartmentOption {
  code: string;       // 台大官方 vDeptCode（直接用於 URL 參數）
  name: string;
  category?: string;
}

export const HOSPITALS: HospitalOption[] = [
  {
    code: "NTUH",
    name: "台大醫院 (台北總院區)",
  },
  {
    code: "CGMH",
    name: "長庚醫院 (林口/台北院區)",
  },
];

// NTUH 科別代碼對應台大官方 vDeptCode 參數
// 可從台大掛號 URL 確認：
// https://reg.ntuh.gov.tw/WebReg/WebReg/RegDeptSchedule?vHospCode=T0&vDeptCode=<這裡>
export const HOSPITAL_DEPARTMENTS: Record<string, DepartmentOption[]> = {
  NTUH: [
    { code: "FAM", name: "家庭醫學部" },
    { code: "CAR", name: "心臟血管內科" },
    { code: "GAS", name: "胃腸肝膽科" },
    { code: "PUL", name: "胸腔內科" },
    { code: "NEP", name: "腎臟內科" },
    { code: "NEU", name: "神經部 (神經內科)" },
    { code: "END", name: "內分泌及新陳代謝科" },
    { code: "HEM", name: "血液腫瘤科" },
    { code: "RHE", name: "風濕免疫過敏科" },
    { code: "INF", name: "感染科" },
    { code: "SUR", name: "一般外科" },
    { code: "THO", name: "胸腔外科" },
    { code: "CVS", name: "心臟血管外科" },
    { code: "NEU_SUR", name: "神經外科" },
    { code: "CRS", name: "大腸直腸外科" },
    { code: "PLA", name: "整形外科" },
    { code: "URO", name: "泌尿部" },
    { code: "ORT", name: "骨科部" },
    { code: "OBS", name: "婦產部" },
    { code: "PED", name: "小兒部" },
    { code: "DER", name: "皮膚部" },
    { code: "OPH", name: "眼科部" },
    { code: "ENT", name: "耳鼻喉部 (口腔咽喉科)" },
    { code: "PSY", name: "精神醫學部" },
    { code: "REH", name: "復健部" },
    { code: "DEN", name: "牙科部" },
  ],
  CGMH: [
    { code: "FAM", name: "家庭醫學科" },
    { code: "CAR", name: "心臟血管內科" },
    { code: "GAS", name: "胃腸肝膽科" },
    { code: "PUL", name: "胸腔內科" },
    { code: "NEP", name: "腎臟科" },
    { code: "NEU", name: "腦神經內科" },
    { code: "END", name: "新陳代謝科" },
    { code: "HEM", name: "血液腫瘤科" },
    { code: "RHE", name: "風濕過敏免疫科" },
    { code: "SUR", name: "一般外科" },
    { code: "CVS", name: "心臟血管外科" },
    { code: "NEU_SUR", name: "腦神經外科" },
    { code: "CRS", name: "大腸直腸肛門外科" },
    { code: "PLA", name: "整形外科" },
    { code: "URO", name: "泌尿外科" },
    { code: "ORT", name: "骨科" },
    { code: "OBS", name: "婦產科" },
    { code: "PED", name: "兒童醫學科" },
    { code: "DER", name: "皮膚科" },
    { code: "OPH", name: "眼科" },
    { code: "ENT", name: "耳鼻喉科" },
    { code: "PSY", name: "精神科" },
    { code: "REH", name: "復健科" },
    { code: "DEN", name: "牙科" },
  ],
};

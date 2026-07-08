export interface LogItem {
  id: string;
  time: string;
  level: "INFO" | "WARN" | "EXEC" | "SUCCESS" | "ERROR";
  message: string;
}

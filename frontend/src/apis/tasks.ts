import { type AxiosResponse } from "axios";
import { axiosInstance } from "./axiosInstance";
import type { QueueTask } from "@/types/type";

export const listTasks = (status?: string): Promise<AxiosResponse<any>> => {
  const params = status ? { status } : {};
  return axiosInstance.get("/tasks", { params });
};

export const createTask = ({
  taskType,
  config,
  status = "pending",
  priority = "MED",
  scheduledAt,
}: {
  taskType: string;
  config: any;
  status?: string;
  priority?: string;
  scheduledAt?: string;
}): Promise<AxiosResponse<any>> => {
  return axiosInstance.post("/tasks", {
    task_type: taskType,
    config,
    status,
    priority,
    scheduled_at: scheduledAt,
  });
};

export const updateTaskApi = ({
  taskId,
  payload,
}: {
  taskId: string;
  payload: {
    status?: string;
    priority?: string;
    scheduled_at?: string;
    config?: any;
  };
}): Promise<AxiosResponse<any>> => {
  return axiosInstance.patch(`/tasks/${taskId}`, payload);
};

export const deleteTaskApi = ({
  taskId,
}: {
  taskId: string;
}): Promise<AxiosResponse<any>> => {
  return axiosInstance.delete(`/tasks/${taskId}`);
};

export const clearTasksApi = ({
  mode = "history",
}: {
  mode?: "history" | "all";
} = {}): Promise<AxiosResponse<any>> => {
  return axiosInstance.delete("/tasks/batch/clear", { params: { mode } });
};

export const executeTask = ({ taskId }: { taskId: string }): Promise<AxiosResponse<any>> =>
  axiosInstance.post(`/tasks/${taskId}/execute`);

export const submitOtp = ({
  taskId,
  otpCode,
}: {
  taskId: string;
  otpCode: string;
}): Promise<AxiosResponse<any>> =>
  axiosInstance.post(`/tasks/${taskId}/otp`, { otp_code: otpCode });

export const getTaskStatus = ({ taskId }: { taskId: string }): Promise<AxiosResponse<any>> =>
  axiosInstance.get(`/tasks/${taskId}/status`);
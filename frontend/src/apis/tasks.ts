import  { type AxiosResponse } from "axios";
import { axiosInstance } from "./axiosInstance";


export const createTask = ({
  taskType,
  config,
}: {
  taskType: string,
  config: any,
}): Promise<AxiosResponse<any>> => {
  return axiosInstance.post("/tasks", {
    task_type: taskType,
    config,
  });
};

export const executeTask = ({taskId}: {taskId: string}): Promise<AxiosResponse<any>> => axiosInstance.post(`/tasks/${taskId}/execute`)
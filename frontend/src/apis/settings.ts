import { type AxiosResponse } from "axios";
import { axiosInstance } from "./axiosInstance";

export const getLineSettings = (): Promise<AxiosResponse<any>> => {
  return axiosInstance.get("/settings/line");
};

export const updateLineSettings = (payload: {
  triggers: string[];
}): Promise<AxiosResponse<any>> => {
  return axiosInstance.post("/settings/line", payload);
};

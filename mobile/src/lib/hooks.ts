import { useQuery } from "@tanstack/react-query";
import { api, type Period } from "./api";
import { keys } from "./query";

export const useProfile = () => useQuery({ queryKey: keys.profile, queryFn: api.getProfile });

export const useReading = (period: Period, enabled = true) =>
  useQuery({ queryKey: keys.reading(period), queryFn: () => api.getReading(period), enabled, staleTime: 30 * 60_000 });

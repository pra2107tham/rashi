import { z } from "zod";
import { invalid } from "./errors";

export function parseInput<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw invalid(`${issue.path.join(".") || "input"}: ${issue.message}`);
  }
  return result.data;
}

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
export const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:mm (24h)");

export const birthDetailsSchema = z.object({
  name: z.string().trim().min(1).max(60),
  birthDate: isoDate.refine((d) => {
    const t = Date.parse(`${d}T00:00:00Z`);
    return !Number.isNaN(t) && t < Date.now() && t > Date.parse("1900-01-01T00:00:00Z");
  }, "birth date must be a real date between 1900 and today"),
  birthTime: hhmm.nullish(),
  placeName: z.string().trim().min(1).max(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type BirthDetails = z.infer<typeof birthDetailsSchema>;

import { appDateOnly } from "@/config/timezone";

export function toDateOnly(value?: string | Date) {
  return appDateOnly(value);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return toDateOnly(next);
}

export function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

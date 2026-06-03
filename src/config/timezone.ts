export const APP_TIME_ZONE = "Asia/Bangkok";
export const APP_TIME_ZONE_OFFSET_HOURS = 7;

const offsetMs = APP_TIME_ZONE_OFFSET_HOURS * 60 * 60 * 1000;

export function appNow() {
  return new Date(Date.now() + offsetMs);
}

export function appDateOnly(value: string | Date = appNow()) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function appTodayInput() {
  return appNow().toISOString().slice(0, 10);
}

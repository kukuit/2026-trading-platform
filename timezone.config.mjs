export const APP_TIME_ZONE = "Asia/Bangkok";
export const APP_TIME_ZONE_OFFSET_HOURS = 7;

export function appNow() {
  return new Date(Date.now() + APP_TIME_ZONE_OFFSET_HOURS * 60 * 60 * 1000);
}

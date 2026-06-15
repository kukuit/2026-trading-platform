import { Prisma } from "@prisma/client";

export function decimalToNumber(value: Prisma.Decimal | number | string | null) {
  if (value === null) return 0;
  return Number(value);
}

export function percentChange(current: number, previous: number | null) {
  if (!previous || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

export function preciseMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(value);
}

export function quantity(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 8,
  }).format(value);
}

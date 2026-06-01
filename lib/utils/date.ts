const LONG: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
};

const SHORT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
};

export function formatDateLong(input: string | Date): string {
  return new Date(input).toLocaleDateString("ru-RU", LONG);
}

export function formatDateShort(input: string | Date): string {
  return new Date(input).toLocaleDateString("ru-RU", SHORT);
}

export function formatDateNumeric(input: string | Date): string {
  return new Date(input).toLocaleDateString("ru-RU");
}

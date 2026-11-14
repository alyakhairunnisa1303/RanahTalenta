import { notFound } from "./errors";

export function parsePositiveId(
  value: string,
  message = "Data tidak ditemukan.",
): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw notFound(message);
  }

  return id;
}

export const DATA_CHANGED_EVENT = "hirematch:data-changed";

export function notifyDataChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

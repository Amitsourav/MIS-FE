// Remembers that the lead page was opened from the Leads list in this tab, so its
// "Back to leads" can use router.back() and land on the same filters and page.
// Module state: a reload or a new tab starts fresh, so Back falls back to /leads.
let openedFromList = false;

export function leadHref(id: string): string {
  return `/leads/${encodeURIComponent(id)}`;
}

// Leads always open in a new tab, so the list or Payout page stays where it was.
export const NEW_TAB = { target: "_blank", rel: "noopener noreferrer" } as const;

/** Row click: open the lead in a new tab, unless the click was on a link or
 * button inside the row, or the user was selecting text. */
export function openLeadRow(e: React.MouseEvent, id: string) {
  if ((e.target as HTMLElement).closest("a, button")) return;
  if (window.getSelection()?.toString()) return; // selecting text, e.g. a phone no.
  window.open(leadHref(id), "_blank", "noopener");
}

export function markOpenedFromList() {
  openedFromList = true;
}

// The lead page reads the flag in a state initializer (which may run twice in
// dev StrictMode) and clears it in an effect, so both reads agree.
export function wasOpenedFromList(): boolean {
  return openedFromList;
}

export function clearOpenedFromList() {
  openedFromList = false;
}

// Remembers that the lead page was opened from the Leads list in this tab, so its
// "Back to leads" can use router.back() and land on the same filters and page.
// Module state: a reload or a new tab starts fresh, so Back falls back to /leads.
let openedFromList = false;

export function leadHref(id: string): string {
  return `/leads/${encodeURIComponent(id)}`;
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

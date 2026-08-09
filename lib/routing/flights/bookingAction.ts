/**
 * Client-safe helper to execute a SerpApi Google Flights booking_request.
 * Never logs postData. Never persists to storage or URL query strings.
 */

import type { FlightBookingAction } from "@/lib/routing/flights/types";

/**
 * Submits a form-urlencoded POST without re-encoding the provider payload.
 * Splits on `&` / first `=` only and sets each value via a hidden input whose
 * value is the percent-decoded field so the browser encodes once on submit.
 */
function submitFormEncodedPost(url: string, postData: string): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  form.target = "_blank";
  form.rel = "noopener noreferrer";
  form.acceptCharset = "UTF-8";
  form.enctype = "application/x-www-form-urlencoded";
  form.style.display = "none";

  for (const pair of postData.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const rawName = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? "" : pair.slice(eq + 1);
    const input = document.createElement("input");
    input.type = "hidden";
    try {
      input.name = decodeURIComponent(rawName.replace(/\+/g, " "));
      input.value = decodeURIComponent(rawValue.replace(/\+/g, " "));
    } catch {
      input.name = rawName;
      input.value = rawValue;
    }
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  form.remove();
}

/** Opens a booking action in a new tab (POST form, GET link, or tel:). */
export function executeFlightBookingAction(action: FlightBookingAction): void {
  if (action.type === "post") {
    submitFormEncodedPost(action.url, action.postData);
    return;
  }
  if (action.type === "get") {
    window.open(action.url, "_blank", "noopener,noreferrer");
    return;
  }
  window.open(`tel:${action.phone.replace(/\s+/g, "")}`, "_self");
}

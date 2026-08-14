// Kape d' Rico — booking form proxy to GoHighLevel
// Holds the GHL Private Integration token server-side as an env var so it
// is never exposed to the browser. The browser POSTs form JSON to /api/submit.

const GHL_BASE = "https://services.leadconnectorhq.com";
const API_VERSION = "2021-07-28";

function json(res, statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}

function ghlHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Version: API_VERSION,
    Accept: "application/json",
  };
}

async function ghlFetch(token, path, init) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    ...init,
    headers: { ...ghlHeaders(token), ...(init?.headers || {}) },
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

// Split a full name into first / last. Single word -> firstName only.
function splitName(full) {
  const trimmed = (full || "").trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

// Loose phone check — GHL wants something dial-able, but we don't enforce E.164.
function looksLikePhone(value) {
  return /^[+\d][\d\s\-()]{6,}$/.test(value || "");
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return json(req, 405, { ok: false, error: "Method not allowed" });
  }

  const token = process.env.GHL_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  const listId = process.env.GHL_LIST_ID;

  if (!token || !locationId || !listId) {
    console.error("Missing GHL env vars");
    return json(req, 500, { ok: false, error: "Server not configured" });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { ok: false, error: "Invalid JSON" });
  }

  const { name, mobile, date, party, notes } = body || {};
  if (!name || !mobile) {
    return json(req, 400, { ok: false, error: "Name and mobile are required" });
  }
  if (!looksLikePhone(mobile)) {
    return json(req, 400, { ok: false, error: "Please enter a valid mobile number" });
  }

  const { firstName, lastName } = splitName(name);

  // 1. Create the contact (phone satisfies GHL's email-or-phone requirement)
  let contactId;
  try {
    const created = await ghlFetch(token, "/contacts/", {
      method: "POST",
      body: JSON.stringify({
        locationId,
        firstName,
        lastName,
        phone: mobile,
        source: "kapedrico-website",
        tags: ["website-booking"],
      }),
    });

    if (created.status >= 400) {
      console.error("GHL create contact failed:", created.status, created.data);
      const status = created.status === 429 ? 429 : 502;
      return json(req, status, {
        ok: false,
        error: "Could not create contact in GoHighLevel",
      });
    }

    contactId = created.data?.contact?.id || created.data?.id;
    if (!contactId) {
      console.error("No contactId in GHL response:", created.data);
      return json(req, 502, { ok: false, error: "Unexpected response from GoHighLevel" });
    }
  } catch (err) {
    console.error("Create contact error:", err);
    return json(req, 500, { ok: false, error: "Failed to reach GoHighLevel" });
  }

  // 2. Attach the booking details as a note (best-effort, non-blocking)
  try {
    const noteBody = [
      "Booking request via website",
      `Date: ${date || "—"}`,
      `Party size: ${party || "—"}`,
      notes ? `Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    await ghlFetch(token, `/contacts/${contactId}/notes/`, {
      method: "POST",
      body: JSON.stringify({ locationId, body: noteBody }),
    });
  } catch (err) {
    // A note failure shouldn't fail the whole request — the contact exists.
    console.error("Add note error (non-fatal):", err);
  }

  // 3. Add the contact to the list — this is what triggers the GHL automation
  try {
    const added = await ghlFetch(token, `/contacts/${contactId}/lists/${listId}`, {
      method: "POST",
      body: JSON.stringify({ locationId }),
    });

    if (added.status >= 400) {
      console.error("GHL add to list failed:", added.status, added.data);
      return json(req, 502, {
        ok: false,
        error: "Contact created but could not add to list",
      });
    }
  } catch (err) {
    console.error("Add to list error:", err);
    return json(req, 502, {
      ok: false,
      error: "Contact created but could not add to list",
    });
  }

  return json(req, 200, { ok: true });
}

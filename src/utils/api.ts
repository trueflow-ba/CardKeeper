const OCR_API_URL = "https://mrjm.zo.space/api/cardkeeper/ocr";

export async function scanBusinessCard(
  base64Image: string,
  mimeType: string = "image/jpeg",
  deviceId: string
): Promise<{
  rawText: string;
  contact: {
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    company: string | null;
    phone: string | null;
    phone2: string | null;
    email: string | null;
    website: string | null;
    linkedin: string | null;
    address: string | null;
  };
  confidence: string;
  imageRotation?: number;
  ocrEngine?: string;
}> {
  const response = await fetch(OCR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-device-id": deviceId,
    },
    body: JSON.stringify({
      image: base64Image,
      mimeType,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `OCR request failed (${response.status})`);
  }

  return response.json();
}

export function generateVCard(contact: {
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  company: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  website: string | null;
  linkedin: string | null;
  address: string | null;
}): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  if (contact.firstName || contact.lastName) {
    const fn = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
    lines.push(`FN:${fn}`);
    lines.push(`N:${contact.lastName || ""};${contact.firstName || ""};;;`);
  }
  if (contact.title) lines.push(`TITLE:${contact.title}`);
  if (contact.company) lines.push(`ORG:${contact.company}`);
  if (contact.phone) lines.push(`TEL;TYPE=WORK,VOICE:${contact.phone}`);
  if (contact.phone2) {
    const p2 = contact.phone2;
    if (p2.toLowerCase().startsWith("fax")) {
      lines.push(`TEL;TYPE=FAX:${p2.replace(/^fax[:.\s]*/i, "")}`);
    } else if (p2.toLowerCase().startsWith("cell") || p2.toLowerCase().startsWith("mobile")) {
      lines.push(`TEL;TYPE=CELL,VOICE:${p2.replace(/^(?:cell|mobile)[:.\s]*/i, "")}`);
    } else {
      lines.push(`TEL;TYPE=HOME,VOICE:${p2.replace(/^[a-z]+[:.\s]*/i, "")}`);
    }
  }
  if (contact.email) lines.push(`EMAIL;TYPE=WORK:${contact.email}`);
  if (contact.website) lines.push(`URL:${contact.website}`);
  if (contact.linkedin) {
    const url = contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`;
    lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${url}`);
  }
  if (contact.address) lines.push(`ADR;TYPE=WORK:;;${contact.address};;;;`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

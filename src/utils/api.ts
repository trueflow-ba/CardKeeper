const OCR_API_URL = "https://mrjm.zo.space/api/cardkeeper/ocr";

export async function scanBusinessCard(
  base64Image: string,
  mimeType: string = "image/jpeg",
  deviceId: string
): Promise<{
  rawText: string;
  contact: {
    name: string | null;
    title: string | null;
    company: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: string | null;
  };
  confidence: string;
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
  name: string | null;
  title: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
}): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  if (contact.name) lines.push(`FN:${contact.name}`);
  if (contact.title) lines.push(`TITLE:${contact.title}`);
  if (contact.company) lines.push(`ORG:${contact.company}`);
  if (contact.phone) lines.push(`TEL;TYPE=WORK,VOICE:${contact.phone}`);
  if (contact.email) lines.push(`EMAIL;TYPE=WORK:${contact.email}`);
  if (contact.website) lines.push(`URL:${contact.website}`);
  if (contact.address) lines.push(`ADR;TYPE=WORK:;;${contact.address};;;;`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

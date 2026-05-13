export interface Contact {
  id: string;
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
  cardImagePath: string | null;
  cardImageRotation: number;
  createdAt: number;
  updatedAt: number;
}

export interface OCRResult {
  rawText: string;
  contact: Omit<Contact, "id" | "cardImagePath" | "createdAt" | "updatedAt">;
  confidence: "high" | "low";
  imageRotation?: number;
  ocrEngine?: string;
}

export function getDisplayName(c: Contact): string {
  if (c.firstName || c.lastName) {
    return [c.firstName, c.lastName].filter(Boolean).join(" ");
  }
  if (c.company) return c.company;
  return "Unknown";
}

export function getInitials(c: Contact): string {
  if (c.firstName || c.lastName) {
    const f = c.firstName ? c.firstName[0] : "";
    const l = c.lastName ? c.lastName[c.lastName.length - 1] : "";
    if (f && l) return (f + l).toUpperCase();
    return (f || l).toUpperCase();
  }
  if (c.company) {
    const words = c.company.trim().split(/\s+/);
    const meaningful = words.filter(
      (w) => !["the","and","of","inc","llc","ltd","corp","co"].includes(w.toLowerCase().replace(".",""))
    );
    if (meaningful.length >= 2) return (meaningful[0][0] + meaningful[1][0]).toUpperCase();
    return words[0][0].toUpperCase();
  }
  return "?";
}

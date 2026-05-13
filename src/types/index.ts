export interface Contact {
  id: string;
  name: string | null;
  title: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
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
}

// Tipe-tipe milik backend. Jangan mencampur dengan src/types/contract.ts (milik bersama).

export type Role = "candidate" | "hrd";

export type SessionPayload = {
  userId: number;
  role: Role;
};

// Bentuk respons API yang seragam.
export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

// Kontrak hasil adapter AI (sama dengan yang harus dipenuhi tim AI).
export type JobScamCheckResult = {
  is_safe: boolean;
  reason?: string;
};

export type CvValidationResult = {
  is_valid_cv: boolean;
  reason?: string;
};

export type ScoreOutput = {
  total: number;
  sim: number;
  mustScore: number;
  skor_kompetensi: number;
  missing: string[];
  kekuatan: {
    poin: string;
    bukti: string;
  }[];
  celah: string[];
  candidateFeedback: string;
  // Kontrak: harus TEPAT 3 pertanyaan.
  pertanyaan_wawancara: string[];
};

export type ScoreLabel = {
  color: "green" | "yellow" | "red";
  label: "Highly Recommended" | "Potential" | "Not Recommended";
};

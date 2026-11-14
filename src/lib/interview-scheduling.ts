export type InterviewScheduleInput = {
  application_id: number;
  date_time: string;
  meeting_url: string;
  notes: string;
};

export type InterviewScheduleRecord = {
  id: number;
  application_id: number;
  scheduled_at: string;
  meeting_url: string;
  notes: string;
  status: "scheduled" | "completed" | "cancelled";
};

export function validateInterviewSchedule(input: InterviewScheduleInput): string | null {
  const scheduledAt = new Date(input.date_time).getTime();
  const meetingUrl = input.meeting_url.trim();
  const notes = input.notes.trim();
  if (!input.date_time || !Number.isFinite(scheduledAt) || scheduledAt <= Date.now()) {
    return "Pilih tanggal dan waktu wawancara yang akan datang.";
  }
  if (meetingUrl.length > 2048) return "Tautan meeting maksimal 2048 karakter.";
  if (meetingUrl) {
    try {
      if (new URL(meetingUrl).protocol !== "https:") throw new Error();
    } catch {
      return "Tautan meeting harus berupa URL HTTPS yang valid.";
    }
  }
  if (notes.length > 4000) return "Catatan maksimal 4000 karakter.";
  return null;
}

export async function saveInterviewSchedule(input: InterviewScheduleInput): Promise<InterviewScheduleRecord> {
  const validationError = validateInterviewSchedule(input);
  if (validationError) throw new Error(validationError);

  const response = await fetch("/api/hrd/interviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      application_id: input.application_id,
      scheduled_at: new Date(input.date_time).toISOString(),
      meeting_url: input.meeting_url,
      notes: input.notes.trim(),
    }),
  });
  const result = await response.json().catch(() => null) as {
    error?: string;
    interview?: InterviewScheduleRecord;
  } | null;
  if (!response.ok || !result?.interview) {
    throw new Error(result?.error ?? "Jadwal wawancara gagal disimpan.");
  }
  return result.interview;
}

export function localDateTimeMinimum(): string {
  const localNow = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return localNow.toISOString().slice(0, 16);
}

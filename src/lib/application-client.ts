import type { ApplyFormValues } from "../components/ApplyDialog";
import type { Application, JobMatch } from "../types/hirematch";

export async function createApplication(
  match: JobMatch,
  values: ApplyFormValues,
): Promise<Application> {
  const form = new FormData();
  form.set("jobId", String(match.job_id));
  form.set("name", values.name);
  form.set("email", values.email);
  form.set("phone", values.phone);
  form.set("portfolioUrl", values.portfolioUrl);
  form.set("acceptedRequirements", String(values.acceptedRequirements));
  form.set("confirmedTruth", String(values.confirmedTruth));
  form.set("coverLetter", values.coverLetter);
  if (values.coverLetterFile) form.set("file", values.coverLetterFile);

  const response = await fetch("/api/applications", {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(result?.error ?? "Surat lamaran gagal disimpan.");
  }
  const result = (await response.json()) as { application: Application };
  return result.application;
}

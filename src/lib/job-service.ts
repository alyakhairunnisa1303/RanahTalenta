import type { Job, Prisma } from "@prisma/client";
import { z } from "zod";
import { getSession } from "./auth";
import { prisma } from "./db";
import { forbidden, notFound, unauthorized } from "./errors";
import { checkJobScam } from "./scorer";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const jobCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Judul minimal 3 karakter.")
    .max(200, "Judul maksimal 200 karakter."),
  description: z
    .string()
    .trim()
    .min(20, "Deskripsi minimal 20 karakter.")
    .max(20000, "Deskripsi maksimal 20000 karakter."),
  requirements: z
    .string()
    .trim()
    .min(10, "Requirements minimal 10 karakter.")
    .max(20000, "Requirements maksimal 20000 karakter."),
  location: z
    .string()
    .trim()
    .min(2, "Lokasi minimal 2 karakter.")
    .max(150, "Lokasi maksimal 150 karakter."),
  salaryRange: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(100, "Salary range maksimal 100 karakter.").optional(),
  ),
});

export const jobUpdateSchema = jobCreateSchema
  .partial()
  .extend({
    status: z.enum(["open", "closed"]).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Minimal satu field harus diisi.",
  });

export type JobCreateInput = z.infer<typeof jobCreateSchema>;
export type JobUpdateInput = z.infer<typeof jobUpdateSchema>;

type JobWithCompany = Pick<
  Job,
  | "id"
  | "hrdId"
  | "title"
  | "description"
  | "requirements"
  | "location"
  | "salaryRange"
  | "status"
  | "createdAt"
> & {
  hrd?: { companyName: string | null } | null;
};

const jobWithCompanySelect = {
  id: true,
  hrdId: true,
  title: true,
  description: true,
  requirements: true,
  location: true,
  salaryRange: true,
  status: true,
  createdAt: true,
  hrd: {
    select: {
      companyName: true,
    },
  },
} satisfies Prisma.JobSelect;

function toJobResponse(job: JobWithCompany) {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    requirements: job.requirements,
    location: job.location,
    salary_range: job.salaryRange,
    status: job.status,
    created_at: job.createdAt.toISOString(),
    company_name: job.hrd?.companyName ?? null,
  };
}

function jobText(input: {
  title: string;
  description: string;
  requirements: string;
}): string {
  return `${input.title}\n${input.description}\n${input.requirements}`;
}

export async function assertVerifiedHrd(userId: number): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isVerified: true },
  });

  if (!user) {
    throw unauthorized("Sesi tidak valid. Silakan login kembali.");
  }

  if (user.role !== "hrd" || !user.isVerified) {
    throw forbidden("Hanya HRD terverifikasi yang dapat mengelola lowongan.");
  }
}

export async function listPublicJobs() {
  const jobs = await prisma.job.findMany({
    where: { status: "open" },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: jobWithCompanySelect,
  });

  return jobs.map(toJobResponse);
}

export async function getJobDetail(jobId: number) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: jobWithCompanySelect,
  });

  if (!job) {
    throw notFound("Lowongan tidak ditemukan.");
  }

  if (job.status !== "open") {
    const session = await getSession();
    if (
      !session ||
      session.role !== "hrd" ||
      session.userId !== job.hrdId
    ) {
      throw notFound("Lowongan tidak ditemukan.");
    }
  }

  return toJobResponse(job);
}

export async function createJobForHrd(
  hrdId: number,
  input: JobCreateInput,
) {
  const scam = await checkJobScam(jobText(input));
  const status = scam.is_safe ? "open" : "flagged";

  const job = await prisma.job.create({
    data: {
      hrdId,
      title: input.title,
      description: input.description,
      requirements: input.requirements,
      location: input.location,
      salaryRange: input.salaryRange ?? null,
      status,
    },
    select: jobWithCompanySelect,
  });

  return {
    job: toJobResponse(job),
    scam_reason: scam.is_safe ? null : (scam.reason ?? null),
  };
}

export async function updateJobForHrd(
  hrdId: number,
  jobId: number,
  input: JobUpdateInput,
) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, hrdId },
    select: jobWithCompanySelect,
  });

  if (!job) {
    throw notFound("Lowongan tidak ditemukan.");
  }

  const contentChanged =
    input.title !== undefined ||
    input.description !== undefined ||
    input.requirements !== undefined;
  const mustCheckScam = contentChanged || input.status === "open";

  let nextStatus = job.status;
  let scamReason: string | null = null;

  if (mustCheckScam) {
    const merged = {
      title: input.title ?? job.title,
      description: input.description ?? job.description,
      requirements: input.requirements ?? job.requirements,
    };
    const scam = await checkJobScam(jobText(merged));

    if (!scam.is_safe) {
      nextStatus = "flagged";
      scamReason = scam.reason ?? "Lowongan terindikasi scam.";
    } else if (input.status) {
      nextStatus = input.status;
    } else if (job.status === "flagged") {
      nextStatus = "open";
    }
  } else if (input.status) {
    nextStatus = input.status;
  }

  const data: Prisma.JobUpdateInput = { status: nextStatus };

  if (input.title !== undefined) {
    data.title = input.title;
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.requirements !== undefined) {
    data.requirements = input.requirements;
  }
  if (input.location !== undefined) {
    data.location = input.location;
  }
  if (input.salaryRange !== undefined) {
    data.salaryRange = input.salaryRange;
  }

  const updated = await prisma.job.update({
    where: { id: job.id },
    data,
    select: jobWithCompanySelect,
  });

  return {
    job: toJobResponse(updated),
    scam_reason: scamReason,
  };
}

export async function listHrdJobs(hrdId: number) {
  const jobs = await prisma.job.findMany({
    where: { hrdId },
    orderBy: { createdAt: "desc" },
    select: {
      ...jobWithCompanySelect,
      _count: {
        select: {
          applications: true,
          jobMatches: true,
        },
      },
    },
  });

  return jobs.map((job) => ({
    ...toJobResponse(job),
    applicants: job._count.applications,
    matches: job._count.jobMatches,
  }));
}

export async function requireOwnedJob(jobId: number, hrdId: number) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, hrdId },
    select: {
      id: true,
      title: true,
      location: true,
      status: true,
      createdAt: true,
    },
  });

  if (!job) {
    throw notFound("Lowongan tidak ditemukan.");
  }

  return job;
}

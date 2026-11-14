import { connection } from "next/server";
import { requireRole } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/db";
import { handleError, jsonOk } from "../../../../../../lib/http";
import { toApplicantEntry } from "../../../../../../lib/hrd-applications";
import { requireOwnedJob } from "../../../../../../lib/job-service";
import { parsePositiveId } from "../../../../../../lib/params";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await connection();

    const session = await requireRole("hrd");
    const { id } = await context.params;
    const jobId = parsePositiveId(id, "Lowongan tidak ditemukan.");
    const job = await requireOwnedJob(jobId, session.userId);

    const applications = await prisma.application.findMany({
      where: { jobId },
      orderBy: { jobMatch: { matchScore: "desc" } },
      include: {
        candidate: {
          select: {
            name: true,
            email: true,
            phone: true,
            portfolioUrl: true,
          },
        },
        jobMatch: {
          select: {
            matchScore: true,
            candidateFeedback: true,
            hrStrengths: true,
            hrGaps: true,
            interviewQuestions: true,
          },
        },
      },
    });

    return jsonOk({
      job: {
        id: job.id,
        title: job.title,
        location: job.location,
        status: job.status,
        created_at: job.createdAt.toISOString(),
      },
      applicants: applications.map(toApplicantEntry),
    });
  } catch (error) {
    return handleError(error);
  }
}

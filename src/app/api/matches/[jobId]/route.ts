import { connection } from "next/server";
import { requireRole } from "../../../../lib/auth";
import { prisma } from "../../../../lib/db";
import { notFound } from "../../../../lib/errors";
import { handleError, jsonOk } from "../../../../lib/http";
import { scoreDetailsFromMatch } from "../../../../lib/matching";
import { parsePositiveId } from "../../../../lib/params";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await connection();

    const session = await requireRole("candidate");
    const { jobId: rawJobId } = await context.params;
    const jobId = parsePositiveId(rawJobId, "Lowongan tidak ditemukan.");

    const match = await prisma.jobMatch.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: session.userId,
          jobId,
        },
      },
      include: {
        job: {
          select: {
            id: true,
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
          },
        },
        application: {
          select: {
            id: true,
            status: true,
            appliedAt: true,
          },
        },
      },
    });

    if (!match) {
      throw notFound(
        "Hasil matching tidak ditemukan. Unggah CV terlebih dahulu.",
      );
    }

    return jsonOk({
      job: {
        id: match.job.id,
        title: match.job.title,
        description: match.job.description,
        requirements: match.job.requirements,
        location: match.job.location,
        salary_range: match.job.salaryRange,
        status: match.job.status,
        company_name: match.job.hrd.companyName,
        created_at: match.job.createdAt.toISOString(),
      },
      match: scoreDetailsFromMatch(match),
      application: match.application
        ? {
            id: match.application.id,
            status: match.application.status,
            applied_at: match.application.appliedAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    return handleError(error);
  }
}

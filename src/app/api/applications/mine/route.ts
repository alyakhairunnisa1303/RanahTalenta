import { connection } from "next/server";
import { requireRole } from "../../../../lib/auth";
import { prisma } from "../../../../lib/db";
import { handleError, jsonOk } from "../../../../lib/http";
import { getScoreLabel } from "../../../../lib/label";

export async function GET() {
  try {
    await connection();

    const session = await requireRole("candidate");
    const applications = await prisma.application.findMany({
      where: { candidateId: session.userId },
      orderBy: { appliedAt: "desc" },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            status: true,
            hrd: {
              select: {
                companyName: true,
              },
            },
          },
        },
        jobMatch: {
          select: {
            matchScore: true,
          },
        },
      },
    });

    return jsonOk({
      applications: applications.map((application) => ({
        id: application.id,
        status: application.status,
        applied_at: application.appliedAt.toISOString(),
        job: {
          id: application.job.id,
          title: application.job.title,
          location: application.job.location,
          status: application.job.status,
          company_name: application.job.hrd.companyName,
        },
        match: {
          match_score: application.jobMatch.matchScore,
          label: getScoreLabel(application.jobMatch.matchScore),
        },
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

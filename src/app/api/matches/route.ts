import { connection } from "next/server";
import { requireRole } from "../../../lib/auth";
import { prisma } from "../../../lib/db";
import { handleError, jsonOk } from "../../../lib/http";
import { getScoreLabel } from "../../../lib/label";

export async function GET() {
  try {
    await connection();

    const session = await requireRole("candidate");
    const matches = await prisma.jobMatch.findMany({
      where: { candidateId: session.userId },
      orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }],
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
        application: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    return jsonOk({
      matches: matches.map((match) => ({
        job_id: match.jobId,
        title: match.job.title,
        company_name: match.job.hrd.companyName,
        location: match.job.location,
        job_status: match.job.status,
        match_score: match.matchScore,
        label: getScoreLabel(match.matchScore),
        ringkasan: match.candidateFeedback,
        application: match.application
          ? {
              id: match.application.id,
              status: match.application.status,
            }
          : null,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

import { connection } from "next/server";
import { requireRole } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/db";
import { notFound } from "../../../../../lib/errors";
import { handleError, jsonOk, parseJson } from "../../../../../lib/http";
import {
  applicationDecisionSchema,
  toApplicationDetail,
  toCandidateIdentity,
} from "../../../../../lib/hrd-applications";
import { parsePositiveId } from "../../../../../lib/params";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await connection();

    const session = await requireRole("hrd");
    const { id } = await context.params;
    const applicationId = parsePositiveId(id, "Lamaran tidak ditemukan.");

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
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
        job: {
          select: {
            id: true,
            title: true,
            hrdId: true,
          },
        },
      },
    });

    if (!application || application.job.hrdId !== session.userId) {
      throw notFound("Lamaran tidak ditemukan.");
    }

    return jsonOk({
      application: toApplicationDetail(application),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireRole("hrd");
    const { id } = await context.params;
    const applicationId = parsePositiveId(id, "Lamaran tidak ditemukan.");
    const input = await parseJson(request, applicationDecisionSchema);

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        job: {
          select: {
            hrdId: true,
          },
        },
        candidate: {
          select: {
            name: true,
            email: true,
            phone: true,
            portfolioUrl: true,
          },
        },
      },
    });

    if (!application || application.job.hrdId !== session.userId) {
      throw notFound("Lamaran tidak ditemukan.");
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: input.status },
      select: {
        id: true,
        status: true,
      },
    });

    const candidate = toCandidateIdentity(
      application.candidate,
      updated.status,
    );

    return jsonOk({
      application: {
        application_id: updated.id,
        candidate_label: `Kandidat #${updated.id}`,
        status: updated.status,
        ...(candidate ? { candidate } : {}),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "../../../lib/auth";
import { prisma } from "../../../lib/db";
import { AppError, conflict, notFound } from "../../../lib/errors";
import { handleError, jsonOk, parseJson } from "../../../lib/http";
import { getScoreLabel } from "../../../lib/label";

const applySchema = z.object({
  jobId: z.coerce
    .number()
    .int()
    .positive("jobId harus berupa angka positif."),
});

export async function POST(request: Request) {
  try {
    const session = await requireRole("candidate");
    const input = await parseJson(request, applySchema);

    const match = await prisma.jobMatch.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: session.userId,
          jobId: input.jobId,
        },
      },
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
      },
    });

    if (!match) {
      throw notFound(
        "Anda belum memiliki hasil matching untuk lowongan ini. Unggah CV terlebih dahulu.",
      );
    }

    if (match.job.status !== "open") {
      throw new AppError(409, "JOB_CLOSED", "Lowongan sudah ditutup.");
    }

    const existing = await prisma.application.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: session.userId,
          jobId: input.jobId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw conflict("Anda sudah melamar lowongan ini.");
    }

    let application;
    try {
      application = await prisma.application.create({
        data: {
          candidateId: session.userId,
          jobId: input.jobId,
          jobMatchId: match.id,
        },
        select: {
          id: true,
          status: true,
          appliedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw conflict("Anda sudah melamar lowongan ini.");
      }
      throw error;
    }

    return jsonOk(
      {
        message: "Lamaran berhasil dikirim.",
        application: {
          id: application.id,
          status: application.status,
          applied_at: application.appliedAt.toISOString(),
        },
        job: {
          id: match.job.id,
          title: match.job.title,
          location: match.job.location,
          company_name: match.job.hrd.companyName,
        },
        match: {
          match_score: match.matchScore,
          label: getScoreLabel(match.matchScore),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}

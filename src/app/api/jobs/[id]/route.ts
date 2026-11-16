import { connection } from "next/server";
import { requireRole } from "../../../../lib/auth";
import { handleError, jsonOk, parseJson } from "../../../../lib/http";
import {
  assertVerifiedHrd,
  getJobDetail,
  jobUpdateSchema,
  updateJobForHrd,
} from "../../../../lib/job-service";
import { parsePositiveId } from "../../../../lib/params";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await connection();
    const { id } = await context.params;
    const job = await getJobDetail(parsePositiveId(id, "Lowongan tidak ditemukan."));
    return jsonOk({ job });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireRole("hrd");
    await assertVerifiedHrd(session.userId);

    const { id } = await context.params;
    const jobId = parsePositiveId(id, "Lowongan tidak ditemukan.");
    const input = await parseJson(request, jobUpdateSchema);
    const result = await updateJobForHrd(session.userId, jobId, input);

    return jsonOk(result);
  } catch (error) {
    return handleError(error);
  }
}

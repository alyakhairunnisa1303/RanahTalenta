import { connection } from "next/server";
import { requireRole } from "../../../lib/auth";
import { handleError, jsonOk, parseJson } from "../../../lib/http";
import {
  assertVerifiedHrd,
  createJobForHrd,
  jobCreateSchema,
  listPublicJobs,
} from "../../../lib/job-service";

export async function GET() {
  try {
    await connection();
    const jobs = await listPublicJobs();
    return jsonOk({ jobs });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole("hrd");
    await assertVerifiedHrd(session.userId);

    const input = await parseJson(request, jobCreateSchema);
    const result = await createJobForHrd(session.userId, input);

    return jsonOk(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

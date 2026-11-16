import { connection } from "next/server";
import { requireRole } from "../../../../lib/auth";
import { handleError, jsonOk } from "../../../../lib/http";
import {
  assertVerifiedHrd,
  listHrdJobs,
} from "../../../../lib/job-service";

export async function GET() {
  try {
    await connection();
    const session = await requireRole("hrd");
    await assertVerifiedHrd(session.userId);

    const jobs = await listHrdJobs(session.userId);
    return jsonOk({ jobs });
  } catch (error) {
    return handleError(error);
  }
}

import {
  handleScreenInfo,
  handleScreenRequest,
} from "@/src/lib/screen-handler";

export async function GET() {
  return handleScreenInfo();
}

export async function POST(request: Request) {
  return handleScreenRequest(request, undefined, { requireLiveGemini: true });
}

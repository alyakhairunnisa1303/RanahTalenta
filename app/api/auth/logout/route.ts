import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/src/lib/auth";

export async function POST() {
  return clearSessionCookie(NextResponse.json({ ok: true }));
}

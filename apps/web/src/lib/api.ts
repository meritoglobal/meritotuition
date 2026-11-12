import "server-only";
import { NextResponse } from "next/server";

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
export const fail = (error: string, status: number) => json({ error }, status);

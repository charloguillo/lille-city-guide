import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

interface Flag {
  mustDo: boolean;
  done: boolean;
  updatedAt: number;
}

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

// Local dev without Redis: in-memory fallback.
const memory = new Map<string, Flag>();

export async function GET() {
  if (!redis) return NextResponse.json(Object.fromEntries(memory));
  const all = (await redis.hgetall<Record<string, Flag>>("flags")) ?? {};
  return NextResponse.json(all, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Partial<Flag> & { id?: unknown };
  if (!body || typeof body.id !== "string" || !/^[a-z0-9-]{1,100}$/.test(body.id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const id = body.id;
  const prev = redis ? await redis.hget<Flag>("flags", id) : memory.get(id);
  const updatedAt = typeof body.updatedAt === "number" ? body.updatedAt : Date.now();
  // Last write wins.
  if (prev && prev.updatedAt > updatedAt) return NextResponse.json(prev);
  const next: Flag = {
    mustDo: typeof body.mustDo === "boolean" ? body.mustDo : (prev?.mustDo ?? false),
    done: typeof body.done === "boolean" ? body.done : (prev?.done ?? false),
    updatedAt,
  };
  if (redis) await redis.hset("flags", { [id]: next });
  else memory.set(id, next);
  return NextResponse.json(next);
}

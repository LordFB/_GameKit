/* ============================================================================
   /__tdd/snippets  — dev-only file-backed snippet store ("serious mode")
   ----------------------------------------------------------------------------
   The concept's §Persistence "serious mode": snippets live in `.tdd/snippets.json`
   on the project root so they can be committed and shared, instead of only in a
   per-browser localStorage. The client storage layer was written to drop in over
   these endpoints without touching the toolkit UI.

   Security boundary (concept §Security boundary): file-backed snippets give this
   endpoint filesystem-adjacent powers, so it is HARD-GUARDED to development and
   404s in any other NODE_ENV. Never enable in production.

     GET    /__tdd/snippets        → { snippets: Snippet[] }
     POST   /__tdd/snippets        ← { snippets: Snippet[] }   (replace all)
     DELETE /__tdd/snippets?id=…   → remove one by id

   The App Router route at `app/__tdd/snippets/route.ts` re-exports
   { GET, POST, DELETE } from here so the logic travels with the component.
   ========================================================================== */

import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Snippet } from "../storage";

const IS_DEV = process.env.NODE_ENV === "development";

// Resolve under the project root and keep the path inside `.tdd/` so a crafted
// value can never escape the directory.
const STORE_DIR = path.join(process.cwd(), ".tdd");
const STORE_FILE = path.join(STORE_DIR, "snippets.json");

function isSnippet(s: unknown): s is Snippet {
  return Boolean(
    s &&
      typeof s === "object" &&
      typeof (s as Snippet).id === "string" &&
      typeof (s as Snippet).name === "string" &&
      typeof (s as Snippet).code === "string"
  );
}

async function readStore(): Promise<Snippet[]> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSnippet) : [];
  } catch (err) {
    // Missing file is the normal first-run case → empty list.
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeStore(snippets: Snippet[]): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(snippets, null, 2), "utf8");
}

export async function GET(): Promise<NextResponse> {
  if (!IS_DEV) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    return NextResponse.json({ snippets: await readStore() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!IS_DEV) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { snippets?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.snippets) || !body.snippets.every(isSnippet)) {
    return NextResponse.json(
      { error: "Expected { snippets: Snippet[] } with id, name, and code on each." },
      { status: 400 }
    );
  }

  try {
    await writeStore(body.snippets);
    return NextResponse.json({ ok: true, count: body.snippets.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  if (!IS_DEV) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing `id` query parameter." }, { status: 400 });
  }

  try {
    const next = (await readStore()).filter((s) => s.id !== id);
    await writeStore(next);
    return NextResponse.json({ ok: true, count: next.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

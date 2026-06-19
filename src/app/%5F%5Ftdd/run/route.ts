/* Dev-only TDD Toolkit Playwright bridge route. The handler lives in the
   component folder so it travels with the toolkit; this file just wires it into
   the App Router. See src/components/Tdd/server/run.ts. */
export { POST, GET } from "@/components/Tdd/server/run";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

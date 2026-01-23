export const runtime = "nodejs";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const authed = cookies().get("admin_authed")?.value === "1";
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const weekStart = url.searchParams.get("weekStart");
  if (!weekStart) return NextResponse.json({ error: "Missing weekStart" }, { status: 400 });

  const [weekly, overall, users] = await Promise.all([
    supabaseAdmin.rpc("get_leaderboard_week", { p_week_start: weekStart }),
    supabaseAdmin.rpc("get_leaderboard_overall"),
    supabaseAdmin.from("users").select("name").order("name"),
  ]);

  if (weekly.error) return NextResponse.json({ error: weekly.error.message }, { status: 500 });
  if (overall.error) return NextResponse.json({ error: overall.error.message }, { status: 500 });
  if (users.error) return NextResponse.json({ error: users.error.message }, { status: 500 });

  const weeklyRows = (weekly.data ?? []) as { name: string; count: number }[];
  const overallRows = (overall.data ?? []) as { name: string; count: number }[];
  const allNames = ((users.data ?? []) as { name: string }[]).map((x) => x.name);

  const weeklyMap = new Map(weeklyRows.map((r) => [r.name, r.count]));
  const met = allNames.filter((n) => (weeklyMap.get(n) ?? 0) >= 2);
  const notMet = allNames.filter((n) => (weeklyMap.get(n) ?? 0) < 2);

  const doc = new PDFDocument({ margin: 40 });
  const chunks: Uint8Array[] = [];
  doc.on("data", (c: Uint8Array) => chunks.push(c));

  const pdfUint8 = await new Promise<Uint8Array>((resolve) => {
    doc.on("end", () => {
      // Combine chunks into one Uint8Array
      const total = chunks.reduce((sum, a) => sum + a.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const a of chunks) {
        merged.set(a, offset);
        offset += a.length;
      }
      resolve(merged);
    });

    doc.fontSize(18).text("Gym Tracker Weekly Report");
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Week starting: ${weekStart}`);
    doc.moveDown();

    doc.fontSize(14).text("This week leaderboard");
    doc.moveDown(0.5);
    if (weeklyRows.length === 0) doc.fontSize(12).text("No uploads.");
    weeklyRows.forEach((r, i) => doc.fontSize(12).text(`${i + 1}. ${r.name}: ${r.count}`));
    doc.moveDown();

    doc.fontSize(14).text("Overall leaderboard");
    doc.moveDown(0.5);
    if (overallRows.length === 0) doc.fontSize(12).text("No uploads.");
    overallRows.forEach((r, i) => doc.fontSize(12).text(`${i + 1}. ${r.name}: ${r.count}`));
    doc.moveDown();

    doc.fontSize(14).text("Met 2 this week");
    doc.moveDown(0.5);
    doc.fontSize(12).text(met.length ? met.join(", ") : "None");
    doc.moveDown();

    doc.fontSize(14).text("Did not meet 2 this week");
    doc.moveDown(0.5);
    doc.fontSize(12).text(notMet.length ? notMet.join(", ") : "None");

    doc.end();
  });

  return new NextResponse(pdfUint8, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="gym-report-${weekStart}.pdf"`,
    },
  });
}

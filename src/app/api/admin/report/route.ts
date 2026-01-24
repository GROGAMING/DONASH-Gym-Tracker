export const runtime = "nodejs";

import { cookies } from "next/headers";
import PDFDocument from "pdfkit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const authed = cookies().get("admin_authed")?.value === "1";
  if (!authed) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }

  const url = new URL(req.url);
  const weekStart = url.searchParams.get("weekStart");
  if (!weekStart) {
    return new Response(JSON.stringify({ error: "Missing weekStart" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  const [weekly, overall, users] = await Promise.all([
    supabaseAdmin.rpc("get_leaderboard_week", { p_week_start: weekStart }),
    supabaseAdmin.rpc("get_leaderboard_overall"),
    supabaseAdmin.from("users").select("name").order("name")
  ]);

  const errMsg = weekly.error?.message || overall.error?.message || users.error?.message;
  if (errMsg) {
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }

  const weeklyRows = (weekly.data ?? []) as { name: string; count: number }[];
  const overallRows = (overall.data ?? []) as { name: string; count: number }[];
  const allNames = ((users.data ?? []) as { name: string }[]).map((x) => x.name);

  const weeklyMap = new Map(weeklyRows.map((r) => [r.name, r.count]));
  const met = allNames.filter((n) => (weeklyMap.get(n) ?? 0) >= 2);
  const notMet = allNames.filter((n) => (weeklyMap.get(n) ?? 0) < 2);

  const doc = new PDFDocument({ margin: 40 });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      doc.on("data", (chunk: Buffer) => {
        const u8 = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
        controller.enqueue(u8);
      });
      doc.on("end", () => controller.close());
      doc.on("error", (err: any) => controller.error(err));

      doc.fontSize(18).text("Gym Tracker Weekly Report");
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Week starting: ${weekStart}`);
      doc.moveDown();

      doc.fontSize(14).text("This week leaderboard");
      doc.moveDown(0.5);
      if (weeklyRows.length === 0) {
        doc.fontSize(12).text("No uploads.");
      } else {
        weeklyRows.forEach((r, i) => doc.fontSize(12).text(`${i + 1}. ${r.name}: ${r.count}`));
      }
      doc.moveDown();

      doc.fontSize(14).text("Overall leaderboard");
      doc.moveDown(0.5);
      if (overallRows.length === 0) {
        doc.fontSize(12).text("No uploads.");
      } else {
        overallRows.forEach((r, i) => doc.fontSize(12).text(`${i + 1}. ${r.name}: ${r.count}`));
      }
      doc.moveDown();

      doc.fontSize(14).text("Met 2 this week");
      doc.moveDown(0.5);
      doc.fontSize(12).text(met.length ? met.join(", ") : "None");
      doc.moveDown();

      doc.fontSize(14).text("Did not meet 2 this week");
      doc.moveDown(0.5);
      doc.fontSize(12).text(notMet.length ? notMet.join(", ") : "None");

      doc.end();
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="gym-report-${weekStart}.pdf"`
    }
  });
}

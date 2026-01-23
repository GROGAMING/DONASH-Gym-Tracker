import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { pw } = await req.json();

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Missing ADMIN_PASSWORD" }, { status: 500 });
  }

  if (pw !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_authed", "1", { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}

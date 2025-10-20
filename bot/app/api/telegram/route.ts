import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    bot.processUpdate(body);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Error processing Telegram update:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

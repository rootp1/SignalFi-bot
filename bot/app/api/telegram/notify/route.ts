import { sendNotification } from "@/lib/telegram";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, message } = body;

    if (!userId || !message) {
      return NextResponse.json(
        { error: "Missing userId or message in request body" },
        { status: 400 },
      );
    }

    sendNotification(userId, message);

    return NextResponse.json({ status: "notification_sent" });
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

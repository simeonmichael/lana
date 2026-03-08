import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ notificationId: string }>;
}

/**
 * POST /api/notifications/[notificationId]/read
 * Mark a user notification as read
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId } = await params;

    const existing = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Notification not found",
        },
        { status: 404 }
      );
    }

    const notification = await db.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to mark notification as read",
      },
      { status: 500 }
    );
  }
}

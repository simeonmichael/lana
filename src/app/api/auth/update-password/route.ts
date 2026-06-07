import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { z } from "zod";
import sentry from "@/lib/sentry";

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = updatePasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validationResult.data;

    // Trim passwords to avoid whitespace issues
    const trimmedCurrentPassword = currentPassword.trim();
    const trimmedNewPassword = newPassword.trim();

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          error: "No password set for this account. Please use the password reset feature.",
        },
        { status: 400 }
      );
    }

    try {
      const isPasswordValid = await verifyPassword(trimmedCurrentPassword, user.passwordHash);

      if (!isPasswordValid) {
        const isDevelopment = process.env.NODE_ENV === "development";
        if (isDevelopment) {
          console.error("Password verification failed:", {
            userId: session.user.id,
            userEmail: session.user.email,
            hasPasswordHash: !!user.passwordHash,
          });
        }
        return NextResponse.json(
          {
            success: false,
            error: "Current password is incorrect. Please check your password and try again.",
          },
          { status: 400 }
        );
      }
    } catch (verifyError: unknown) {
      const isDevelopment = process.env.NODE_ENV === "development";
      if (isDevelopment) {
        console.error("Password verification error:", verifyError);
      }
      else{
        sentry.logger.error("Password verification error", {
          error: verifyError instanceof Error ? verifyError.message : String(verifyError),
          userId: session.user.id,
          userEmail: session.user.email
        })
      }
      return NextResponse.json(
        { success: false, error: "An error occurred while verifying your password" },
        { status: 500 }
      );
    }

    const newPasswordHash = await hashPassword(trimmedNewPassword);

    await db.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newPasswordHash },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    const isDevelopment = process.env.NODE_ENV === "development";
    if (isDevelopment) {
      console.error("Update password error:", error);
    }
    else{
      sentry.logger.error("Failed to update password",{
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return NextResponse.json(
      { success: false, error: "Failed to update password" },
      { status: 500 }
    );
  }
}

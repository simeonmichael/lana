import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyToken, createVerificationToken, sendVerificationEmail } from "@/lib/email";

const verifySchema = z.object({
  token: z.string().min(1, "Token is required"),
});

const resendSchema = z.object({
  email: z.email("Invalid email address"),
});

// Verify email with token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = verifySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const { token } = validationResult.data;

    // Verify the token
    const result = await verifyToken(token);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired verification token",
        },
        { status: 400 }
      );
    }

    // Update user's email verified status
    const user = await db.user.update({
      where: { email: result.email },
      data: { emailVerified: new Date() },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Email verified successfully. You can now sign in.",
        data: {
          email: user.email,
          name: user.name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred during verification. Please try again.",
      },
      { status: 500 }
    );
  }
}

// Resend verification email
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = resendSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Find user
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists or not
      return NextResponse.json(
        {
          success: true,
          message: "If an account exists with this email, a verification link will be sent.",
        },
        { status: 200 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is already verified",
        },
        { status: 400 }
      );
    }

    // Generate new verification token
    const token = await createVerificationToken(email);

    // Send verification email
    await sendVerificationEmail(email, user.name || "User", token);

    return NextResponse.json(
      {
        success: true,
        message: "Verification email sent. Please check your inbox.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred. Please try again.",
      },
      { status: 500 }
    );
  }
}

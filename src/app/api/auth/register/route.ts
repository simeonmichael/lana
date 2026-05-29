import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { createVerificationToken, sendVerificationEmail } from "@/lib/email";

const registerSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
  email: z.email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = registerSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const { name, email, password } = validationResult.data;

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email already exists",
        },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "STUDENT",
      },
    });

    // Create student profile
    await db.studentProfile.create({
      data: {
        userId: user.id,
      },
    });

    // Generate verification token
    const token = await createVerificationToken(email);

    // Send verification email
    try {
      await sendVerificationEmail(email, name, token);
    } catch (emailError: unknown) {
      // Log error details only in development
      const isDevelopment = process.env.NODE_ENV === "development";
      if (isDevelopment) {
        console.error("Failed to send verification email:", emailError);
      } else {
        const errorObj = emailError instanceof Error ? emailError : new Error(String(emailError));
        const errorWithCode = emailError as { code?: string };
        console.error("Failed to send verification email:", {
          code: errorWithCode?.code,
          message: errorObj.message,
        });
      }
      return NextResponse.json(
        {
          success: false,
          error: "An error occurred during registration. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully. Please check your email to verify your account.",
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    // Log full error details only in development
    const isDevelopment = process.env.NODE_ENV === "development";
    if (isDevelopment) {
      console.error("Registration error:", error);
    } else {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error("Registration error:", {
        message: errorObj.message,
        name: errorObj.name,
      });
    }
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred during registration. Please try again.",
      },
      { status: 500 }
    );
  }
}

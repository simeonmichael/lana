import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureUserExists } from "@/lib/ensure-user";
import { z } from "zod";
import { LearningStyle } from "@prisma/client";
import {
  getCareerRecommendationsRAG,
  type UserAptitudeProfile,
  type RecommendedCareer,
} from "@/lib/career-recommendation-engine";
import Sentry from "@/lib/sentry";

const aptitudeSchema = z.object({
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  userType: z.enum(["Employed", "Employer"]).optional().default("Employed"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user exists in database (important for OAuth users)
    await ensureUserExists({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    });

    const body = await request.json();
    const validationResult = aptitudeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ success: false, error: "Invalid request data" }, { status: 400 });
    }

    const { answers } = validationResult.data;

    // Extract learning style from answers
    const learningStyleAnswer = answers.learning_style as string | undefined;
    let learningStyle: LearningStyle | null = null;

    if (
      learningStyleAnswer &&
      ["VISUAL", "AUDITORY", "READING_WRITING", "KINESTHETIC"].includes(learningStyleAnswer)
    ) {
      learningStyle = learningStyleAnswer as LearningStyle;
    }

    // Extract interests (multiple choice)
    const interests = Array.isArray(answers.interests)
      ? answers.interests
      : answers.interests
        ? [answers.interests]
        : [];

    // Extract strengths (multiple choice)
    const strengths = Array.isArray(answers.strengths)
      ? answers.strengths
      : answers.strengths
        ? [answers.strengths]
        : [];

    // Extract goals (multiple choice)
    const goals = Array.isArray(answers.goals)
      ? answers.goals
      : answers.goals
        ? [answers.goals]
        : [];

    // Extract education level
    const education = answers.education as string | undefined;

    // Build user profile for RAG recommendation
    const userProfile: UserAptitudeProfile = {
      userId: session.user.id,
      learningStyle,
      interests,
      strengths,
      goals,
      education,
    };

    // Get career recommendations using RAG (Pinecone + OpenRouter)
    // Note: Courses are generated later when user selects a career
    let careerRecommendations: RecommendedCareer[] = [];
    try {
      careerRecommendations = await getCareerRecommendationsRAG(userProfile);
    } catch (ragError) {
      Sentry.logger.error("RAG recommendation failed, using fallback", {
        error: ragError instanceof Error ? ragError.message : String(ragError),
      });
    }

    // Update student profile with aptitude results and recommendations
    const updatedProfile = await db.studentProfile.upsert({
      where: { userId: session.user.id },
      update: {
        learningStyle,
        interests,
        strengths,
        aptitudeResults: answers,
        aptitudeCompleted: true,
        completedAt: new Date(),
        recommendedCareers: JSON.parse(JSON.stringify(careerRecommendations)),
      },
      create: {
        userId: session.user.id,
        learningStyle,
        interests,
        strengths,
        aptitudeResults: answers,
        aptitudeCompleted: true,
        completedAt: new Date(),
        recommendedCareers: JSON.parse(JSON.stringify(careerRecommendations)),
        recommendedCourses: [],
      },
    });

    return NextResponse.json({
      success: true,
      message: "Aptitude test completed successfully",
      data: {
        learningStyle: updatedProfile.learningStyle,
        interests: updatedProfile.interests,
        strengths: updatedProfile.strengths,
        recommendations: {
          careers: careerRecommendations,
        },
      },
    });
  } catch (error) {
    console.error("Aptitude save error:", error);

    // Return more specific error message
    const errorMessage = error instanceof Error ? error.message : "Failed to save aptitude results";

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const profile = await db.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        learningStyle: true,
        interests: true,
        strengths: true,
        weaknesses: true,
        aptitudeResults: true,
        aptitudeCompleted: true,
        completedAt: true,
        recommendedCareers: true,
        recommendedCourses: true,
      },
    });

    if (!profile) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Aptitude fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch aptitude results" },
      { status: 500 }
    );
  }
}

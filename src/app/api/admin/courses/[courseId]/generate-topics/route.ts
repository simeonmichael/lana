import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatCompletion, type Message } from "@/lib/openrouter";

interface RouteParams {
  params: Promise<{ courseId: string }>;
}

/**
 * POST /api/admin/courses/[courseId]/generate-topics
 * Generate course topics and sections using AI
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { courseId } = await params;
    const body = await request.json();
    const { numTopics } = body;

    // Get course details
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        description: true,
        level: true,
        skills: true,
        careerPaths: true,
      },
    });

    if (!course) {
      return NextResponse.json({ success: false, error: "Course not found" }, { status: 404 });
    }

    const careerPath = course.careerPaths[0] || course.title;
    const skills = course.skills.join(", ") || "General skills";
    const level = course.level || "BEGINNER";

    // Enhanced prompt based on top university curriculum standards (MIT, Stanford, Harvard)
    const prompt = `You are a curriculum designer from MIT/Stanford/Harvard. Create a comprehensive, well-structured professional course curriculum for "${careerPath}".

COURSE CONTEXT:
- Title: ${course.title}
- Description: ${course.description}
- Level: ${level}
- Skills: ${skills}
- Career Path: ${careerPath}

CURRICULUM DESIGN PRINCIPLES (Based on MIT/Stanford/Harvard Standards):
1. Progressive Learning: Start with fundamentals and build complexity gradually
2. Practical Application: Balance theory with hands-on practice
3. Industry Alignment: Match real-world professional requirements
4. Comprehensive Coverage: Ensure complete skill development from beginner to job-ready
5. Modular Structure: Organize content into logical, digestible sections

SECTION ORGANIZATION (University-Level Structure):
Use these standard section names that match top university curricula:

1. "Introduction & Foundations" - Core concepts, terminology, industry overview
2. "Core Fundamentals" - Essential principles, basic techniques, foundational skills
3. "Intermediate Skills" - Advanced techniques, real-world applications, problem-solving
4. "Advanced & Professional" - Industry standards, best practices, complex projects
5. "Career Launch" - Portfolio development, interview prep, job search strategies

TOPIC GENERATION REQUIREMENTS:
- Generate ${numTopics || 20} comprehensive topics (15-30 recommended)
- Each topic should be substantial (30-60 minutes of content)
- Topics must be in logical, sequential order
- Use natural, concise topic titles (DO NOT include "${careerPath}" in titles - it's redundant)
- Each topic needs a detailed 2-3 sentence description
- Topics should be field-specific and industry-relevant
- Ensure progressive difficulty from beginner to advanced

TOPIC TITLE EXAMPLES (GOOD):
- "Introduction & Overview"
- "Core Principles and Fundamentals"
- "Working with Advanced Techniques"
- "Building Your First Project"
- "Industry Best Practices"

TOPIC TITLE EXAMPLES (BAD - avoid these):
- "${careerPath} Introduction"
- "${careerPath} Fundamentals"
- "What is ${careerPath}?"

Generate JSON response with this EXACT structure:
{
  "topics": [
    {
      "title": "Natural topic title WITHOUT course name",
      "description": "Detailed 2-3 sentence description covering what will be learned, including key subtopics and learning objectives",
      "section": "Introduction & Foundations",
      "sectionOrder": 1,
      "order": 1,
      "duration": 45
    }
  ]
}

IMPORTANT:
- Organize topics into the 5 standard sections listed above
- Ensure sectionOrder increments within each section (1, 2, 3...)
- Ensure order increments globally across all topics (1, 2, 3...)
- Duration should be 30-60 minutes per topic
- Return ONLY valid JSON, no additional text or markdown formatting`;

    const messages: Message[] = [
      {
        role: "system",
        content:
          "You are an expert curriculum designer from top universities (MIT, Stanford, Harvard). You create well-structured, progressive learning paths that match industry standards. Always respond with valid JSON only, no markdown code blocks.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await chatCompletion(messages, {
      model: "google/gemini-2.5-flash", // Use Google Gemini
      temperature: 0.3,
      maxTokens: 6000, // Increased for comprehensive topic generation
    });

    try {
      // Extract JSON from response (remove markdown code blocks if present)
      const cleanedResponse = response
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // Find JSON object
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and structure topics
      if (!parsed.topics || !Array.isArray(parsed.topics)) {
        throw new Error("Invalid response: topics array not found");
      }

      // Validate and clean topics
      const validatedTopics = parsed.topics
        .filter((t: Record<string, unknown>) => {
          return (
            typeof t.title === "string" &&
            t.title.trim().length > 0 &&
            typeof t.description === "string" &&
            typeof t.section === "string" &&
            typeof t.sectionOrder === "number" &&
            typeof t.order === "number" &&
            typeof t.duration === "number"
          );
        })
        .map((t: Record<string, unknown>, idx: number) => ({
          title: (t.title as string).trim(),
          description: (t.description as string).trim(),
          section: (t.section as string).trim(),
          sectionOrder: t.sectionOrder as number,
          order: (t.order as number) || idx + 1,
          duration: Math.max(30, Math.min(120, t.duration as number)), // Clamp between 30-120 minutes
        }));

      if (validatedTopics.length === 0) {
        throw new Error("No valid topics generated");
      }

      // Sort topics by order
      validatedTopics.sort((a: { order: number }, b: { order: number }) => a.order - b.order);

      return NextResponse.json({
        success: true,
        topics: validatedTopics,
        message: `Generated ${validatedTopics.length} topics organized into sections`,
      });
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("Raw response:", response);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse AI response. Please try again.",
          details: parseError instanceof Error ? parseError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error generating topics:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate topics",
      },
      { status: 500 }
    );
  }
}

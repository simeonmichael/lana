import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SAMPLE_CAREERS } from "@/lib/careers";

/**
 * GET /api/search?q=searchTerm
 * Global search across courses, careers, and jobs
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase() || "";

    if (q.length < 2) {
      return NextResponse.json({
        success: true,
        data: { courses: [], careers: [], jobs: [] },
      });
    }

    const searchWords = q.split(/\s+/).filter(Boolean);

    const matchesText = (text: string) => {
      const lower = text.toLowerCase();
      return searchWords.some((w) => lower.includes(w));
    };

    const matchesAny = (items: string[]) => {
      return searchWords.some((w) => items.some((item) => item.toLowerCase().includes(w)));
    };

    // Search courses
    const allCourses = await db.course.findMany({
      where: { isPublished: true },
      include: {
        _count: { select: { topics: true, enrollments: true } },
      },
      take: 50,
    });

    const courses = allCourses.filter(
      (c) =>
        matchesText(c.title) ||
        matchesText(c.description) ||
        matchesAny(c.skills) ||
        matchesAny(c.careerPaths)
    );

    // Search careers (from sample data)
    const careers = SAMPLE_CAREERS.filter(
      (c) =>
        matchesText(c.title) ||
        matchesText(c.description) ||
        matchesText(c.category) ||
        matchesAny(c.skills)
    );

    // Search jobs
    const allJobs = await db.job.findMany({
      where: { isActive: true },
      include: { company: true },
      take: 50,
    });

    const jobs = allJobs.filter(
      (j) =>
        matchesText(j.title) ||
        matchesText(j.description || "") ||
        matchesText(j.company.name) ||
        matchesAny(j.requiredSkills)
    );

    return NextResponse.json({
      success: true,
      data: {
        courses: courses.slice(0, 8).map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          description: c.description,
          level: c.level,
          duration: c.duration,
          topicCount: c._count.topics,
        })),
        careers: careers.slice(0, 8).map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          category: c.category,
        })),
        jobs: jobs.slice(0, 8).map((j) => ({
          id: j.id,
          title: j.title,
          slug: j.slug,
          companyName: j.company.name,
          location: j.location,
        })),
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ success: false, error: "Search failed" }, { status: 500 });
  }
}

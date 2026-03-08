import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Suspense } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Mascot,
} from "@/components/ui";
import { BookOpen, Clock, BarChart3, ArrowRight, Filter } from "lucide-react";
import { CourseSearch } from "@/components/courses/course-search";

interface CoursesPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const { q: searchQuery } = await searchParams;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Get user's profile and enrollments
  const [profile, enrollments, courses] = await Promise.all([
    db.studentProfile.findUnique({
      where: { userId: session.user.id },
    }),
    db.enrollment.findMany({
      where: { userId: session.user.id },
      include: { course: true },
    }),
    db.course.findMany({
      where: { isPublished: true },
      include: {
        _count: {
          select: { topics: true, enrollments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
  const hasCompletedAptitude = profile?.aptitudeCompleted ?? false;

  // Filter courses by search query
  const searchLower = searchQuery?.toLowerCase().trim() || "";
  const filteredCourses =
    searchLower.length < 2
      ? courses
      : courses.filter((course) => {
          const matchesText = (text: string) => text.toLowerCase().includes(searchLower);
          const matchesAny = (items: string[]) =>
            items.some((item) => item.toLowerCase().includes(searchLower));
          return (
            matchesText(course.title) ||
            matchesText(course.description) ||
            matchesAny(course.skills) ||
            matchesAny(course.careerPaths)
          );
        });

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-foreground text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground mt-1">
            Explore courses tailored to your career goals
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex w-full items-center gap-3 lg:w-auto">
          <Suspense fallback={<div className="bg-muted h-10 w-64 animate-pulse rounded-xl" />}>
            <CourseSearch />
          </Suspense>
          <Button variant="outline" size="icon" className="h-10 w-10">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Aptitude CTA for users who haven't taken the test */}
      {!hasCompletedAptitude && (
        <Card className="from-secondary to-secondary/50 border-0 bg-gradient-to-r">
          <CardContent className="py-6">
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <Mascot size="md" mood="waving" animate={false} />
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-foreground font-semibold">Get Personalized Recommendations</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Take the aptitude test to see courses matched to your interests and learning
                  style.
                </p>
              </div>
              <Link href="/onboarding">
                <Button rightIcon={<ArrowRight className="h-4 w-4" />}>Take Test</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Enrollments */}
      {enrollments.length > 0 && (
        <div>
          <h2 className="text-foreground mb-4 text-xl font-semibold">Continue Learning</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment) => (
              <Link key={enrollment.id} href={`/courses/${enrollment.course.slug}`}>
                <Card variant="interactive" className="h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs font-medium">
                        {enrollment.course.level}
                      </span>
                      <span className="text-primary text-sm font-medium">
                        {Math.round(enrollment.progress)}%
                      </span>
                    </div>
                    <CardTitle className="mt-2 text-lg">{enrollment.course.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Progress bar */}
                    <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${enrollment.progress}%` }}
                      />
                    </div>
                    <p className="text-muted-foreground mt-3 text-sm">
                      {enrollment.status === "COMPLETED"
                        ? "Completed"
                        : `${enrollment.progress < 100 ? "In Progress" : "Ready for exam"}`}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All Courses */}
      <div>
        <h2 className="text-foreground mb-4 text-xl font-semibold">
          {hasCompletedAptitude ? "Recommended For You" : "All Courses"}
        </h2>

        {filteredCourses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Mascot size="lg" mood="thinking" animate={false} />
              <h3 className="text-foreground mt-4 font-semibold">
                {searchLower ? "No courses match your search" : "No courses available yet"}
              </h3>
              <p className="text-muted-foreground mt-2">
                {searchLower ? "Try a different search term" : "Check back soon for new courses!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => {
              const isEnrolled = enrolledCourseIds.has(course.id);

              return (
                <Link key={course.id} href={`/courses/${course.slug}`}>
                  <Card variant="interactive" className="h-full">
                    {/* Thumbnail */}
                    <div className="from-primary/20 to-secondary flex h-40 items-center justify-center rounded-t-2xl bg-gradient-to-br">
                      <BookOpen className="text-primary/50 h-12 w-12" />
                    </div>

                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs font-medium">
                          {course.level}
                        </span>
                        {isEnrolled && (
                          <span className="bg-success/10 text-success rounded-full px-2 py-1 text-xs font-medium">
                            Enrolled
                          </span>
                        )}
                      </div>
                      <CardTitle className="mt-2 text-lg">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {course.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="text-muted-foreground flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          <span>{course._count.topics} Topics</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{course.duration}h</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-4 w-4" />
                          <span>{course._count.enrollments}</span>
                        </div>
                      </div>

                      {/* Skills tags */}
                      {course.skills.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {course.skills.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
                            >
                              {skill}
                            </span>
                          ))}
                          {course.skills.length > 3 && (
                            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                              +{course.skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

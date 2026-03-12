import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Mascot,
  Button,
} from "@/components/ui";
import Link from "next/link";
import { ArrowRight, BookOpen, Award, Briefcase, Brain } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch all user stats in parallel
  const [profile, enrollmentCount, certificateCount, applicationCount, existingCourses] =
    await Promise.all([
      // Check if user has completed aptitude test
      db.studentProfile.findUnique({
        where: { userId: session.user.id },
      }),
      // Count enrollments
      db.enrollment.count({
        where: { userId: session.user.id },
      }),
      // Count certificates
      db.certificate.count({
        where: { userId: session.user.id },
      }),
      // Count job applications
      db.jobApplication.count({
        where: { userId: session.user.id },
      }),
      // Fetch existing courses from database
      db.course.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          level: true,
          duration: true,
        },
      }),
    ]);

  const hasCompletedAptitude = profile?.aptitudeCompleted ?? false;

  return (
    <div className="animate-fade-in space-y-8">
      {/* Welcome Section */}
      <div className="from-secondary/30 to-tertiary/30 flex flex-col items-start gap-6 rounded-2xl bg-gradient-to-r p-6 lg:flex-row lg:items-center lg:p-8">
        <div className="flex-1">
          <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
            Welcome back, {session.user.name?.split(" ")[0] || "Student"}! 👋
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            {hasCompletedAptitude
              ? "Continue your learning journey and explore new opportunities."
              : "Let's get started by discovering your strengths and interests."}
          </p>
        </div>
        <div className="hidden lg:block">
          <Mascot size="lg" mood={hasCompletedAptitude ? "happy" : "waving"} animate={false} />
        </div>
      </div>

      {/* CTA Card for users who haven't completed aptitude test */}
      {!hasCompletedAptitude && (
        <Card className="from-primary via-primary to-primary/80 relative overflow-hidden border-0 bg-gradient-to-br text-white">
          <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5" />
          <div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-1/2 translate-y-1/2 rounded-full bg-white/5" />
          <CardContent className="relative px-6 py-8 lg:px-8">
            <div className="flex flex-col items-center gap-6 lg:flex-row">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur lg:h-20 lg:w-20">
                <Brain className="h-8 w-8 lg:h-10 lg:w-10" />
              </div>
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-xl font-bold sm:text-2xl">Take Your Aptitude Test</h2>
                <p className="mt-2 max-w-lg text-sm text-white/80 sm:text-base">
                  Discover your unique strengths, learning style, and get personalized career
                  recommendations powered by AI.
                </p>
              </div>
              <Link href="/onboarding" className="shrink-0">
                <Button
                  variant="secondary"
                  size="lg"
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                  className="shadow-lg"
                >
                  Start Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        <Link href="/courses" className="block">
          <Card variant="interactive" className="h-full">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="bg-secondary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14">
                  <BookOpen className="text-primary h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div className="min-w-0">
                  <p className="text-foreground text-2xl font-bold sm:text-3xl">
                    {enrollmentCount}
                  </p>
                  <p className="text-muted-foreground truncate text-xs sm:text-sm">
                    Courses Enrolled
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/certificates" className="block">
          <Card variant="interactive" className="h-full">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="bg-tertiary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14">
                  <Award className="text-primary h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div className="min-w-0">
                  <p className="text-foreground text-2xl font-bold sm:text-3xl">
                    {certificateCount}
                  </p>
                  <p className="text-muted-foreground truncate text-xs sm:text-sm">Certificates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/jobs" className="block">
          <Card variant="interactive" className="h-full">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="bg-secondary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14">
                  <Briefcase className="text-primary h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div className="min-w-0">
                  <p className="text-foreground text-2xl font-bold sm:text-3xl">
                    {applicationCount}
                  </p>
                  <p className="text-muted-foreground truncate text-xs sm:text-sm">Applications</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={hasCompletedAptitude ? "/recommendations" : "/onboarding"} className="block">
          <Card variant="interactive" className="h-full">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="bg-tertiary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14">
                  <Brain className="text-primary h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-lg font-bold sm:text-xl ${hasCompletedAptitude ? "text-success" : "text-amber-500"}`}
                  >
                    {hasCompletedAptitude ? "Done ✓" : "Pending"}
                  </p>
                  <p className="text-muted-foreground truncate text-xs sm:text-sm">Aptitude Test</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recommended Careers & Courses */}
      {hasCompletedAptitude &&
        profile?.recommendedCareers &&
        Array.isArray(profile.recommendedCareers) &&
        profile.recommendedCareers.length > 0 && (
          <div className="space-y-8">
            {/* Top Career Matches */}
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-foreground text-xl font-semibold">Your Top Career Matches</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Based on your aptitude results
                  </p>
                </div>
                <Link
                  href="/recommendations"
                  className="text-primary flex items-center gap-1 text-sm font-medium hover:underline"
                >
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {(
                  profile.recommendedCareers as Array<{
                    id: string;
                    title: string;
                    description: string;
                    matchScore: number;
                    category?: string;
                  }>
                )
                  .slice(0, 3)
                  .map((career, index) => (
                    <Link key={`${career.id}-${index}`} href="/recommendations">
                      <Card variant="interactive" className="h-full">
                        <CardHeader className="pb-4">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs font-medium">
                              {career.category || "Career"}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-primary text-lg font-bold">
                                {career.matchScore}%
                              </span>
                              <span className="text-muted-foreground text-xs">match</span>
                            </div>
                          </div>
                          <CardTitle className="text-lg">{career.title}</CardTitle>
                          <CardDescription className="mt-2 line-clamp-2">
                            {career.description}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
              </div>
            </div>

            {/* Recommended Courses */}
            {profile?.recommendedCourses &&
              Array.isArray(profile.recommendedCourses) &&
              profile.recommendedCourses.length > 0 && (
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-foreground text-xl font-semibold">Recommended Courses</h2>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Tailored to your career goals
                      </p>
                    </div>
                    <Link
                      href="/courses"
                      className="text-primary flex items-center gap-1 text-sm font-medium hover:underline"
                    >
                      View All
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                    {(() => {
                      const recommendedCourses = profile.recommendedCourses as Array<{
                        id: string;
                        title: string;
                        matchScore: number;
                        level: string;
                        duration: string;
                      }>;

                      // Create lookup of existing DB course titles
                      const dbCourseTitles = new Map(
                        existingCourses.map((c) => [c.title?.toLowerCase().trim(), c])
                      );

                      // For each recommended course, use DB version if it exists
                      const mergedCourses = recommendedCourses.map((rec) => {
                        const titleKey = rec.title?.toLowerCase().trim();
                        const dbCourse = dbCourseTitles.get(titleKey);

                        if (dbCourse) {
                          // Use database course with recommendation's matchScore
                          return {
                            id: dbCourse.slug || dbCourse.id,
                            title: dbCourse.title,
                            matchScore: rec.matchScore,
                            level: dbCourse.level,
                            duration:
                              typeof dbCourse.duration === "number"
                                ? `${dbCourse.duration}h`
                                : dbCourse.duration,
                            isFromDb: true,
                          };
                        }
                        return { ...rec, isFromDb: false };
                      });

                      // Deduplicate by title
                      const seen = new Set<string>();
                      return mergedCourses
                        .filter((course) => {
                          const key = course.title?.toLowerCase().trim();
                          if (!key || seen.has(key)) return false;
                          seen.add(key);
                          return true;
                        })
                        .slice(0, 4);
                    })().map((course, index) => (
                      <Link
                        key={`${course.id}-${index}`}
                        href={`/courses/${course.id}`}
                        className="block"
                      >
                        <Card variant="interactive" className="h-full">
                          <CardHeader className="pb-3">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-primary text-xs font-semibold tracking-wide uppercase">
                                {course.level}
                              </span>
                              <span className="text-primary text-sm font-bold">
                                {course.matchScore}%
                              </span>
                            </div>
                            <CardTitle className="text-base leading-tight">
                              {course.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-muted-foreground text-sm">{course.duration}</p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

      {/* Getting Started Guide (for new users) */}
      {!hasCompletedAptitude && (
        <div>
          <div className="mb-6">
            <h2 className="text-foreground text-xl font-semibold">Getting Started</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Follow these steps to unlock your personalized career path
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
            <Card className="relative overflow-hidden p-2">
              <div className="bg-primary absolute top-0 left-0 h-full w-1" />
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                    1
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold">Take Aptitude Test</h3>
                    <p className="text-muted-foreground mt-2 text-sm">
                      Discover your unique strengths and learning style through our comprehensive
                      assessment.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden p-2 opacity-60">
              <div className="bg-muted absolute top-0 left-0 h-full w-1" />
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold">Get Recommendations</h3>
                    <p className="text-muted-foreground mt-2 text-sm">
                      Receive AI-powered career and course suggestions tailored to your profile.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden p-2 opacity-60">
              <div className="bg-muted absolute top-0 left-0 h-full w-1" />
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold">Start Learning</h3>
                    <p className="text-muted-foreground mt-2 text-sm">
                      Enroll in courses designed for your career path and begin your journey.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Mascot,
} from "@/components/ui";
import { Compass, TrendingUp, GraduationCap, ArrowRight, Search, Briefcase } from "lucide-react";
import { SAMPLE_CAREERS } from "@/lib/careers";

export default async function CareersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
  });

  const hasCompletedAptitude = profile?.aptitudeCompleted ?? false;

  // In production, careers would be filtered/sorted based on profile data
  const careers = SAMPLE_CAREERS;

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-foreground text-3xl font-bold">Explore Careers</h1>
          <p className="text-muted-foreground mt-1">
            Discover career paths that match your interests and skills
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-64">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search careers..."
            className="border-border bg-card focus:ring-primary h-10 w-full rounded-xl border pr-4 pl-10 text-sm focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      {/* Aptitude CTA */}
      {!hasCompletedAptitude && (
        <Card className="from-primary to-primary/80 border-0 bg-gradient-to-r text-white">
          <CardContent className="py-6">
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                <Compass className="h-8 w-8" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-lg font-semibold">Find Your Perfect Career Match</h3>
                <p className="mt-1 text-white/80">
                  Take our aptitude test to get personalized career recommendations based on your
                  strengths and interests.
                </p>
              </div>
              <Link href="/onboarding">
                <Button variant="secondary" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Take Aptitude Test
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Your Profile Summary (if aptitude completed) */}
      {hasCompletedAptitude && profile && (
        <Card className="bg-secondary/30 p-4">
          <CardContent className="py-6">
            <div className="flex flex-col items-start gap-6 md:flex-row">
              <Mascot size="md" mood="happy" animate={false} />
              <div className="flex-1">
                <h3 className="text-foreground font-semibold">Your Profile</h3>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground text-xs tracking-wide uppercase">
                      Learning Style
                    </p>
                    <p className="text-foreground mt-1 font-medium">
                      {profile.learningStyle?.replace("_", " ") || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs tracking-wide uppercase">
                      Top Interests
                    </p>
                    <p className="text-foreground mt-1 font-medium">
                      {profile.interests?.slice(0, 2).join(", ") || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs tracking-wide uppercase">
                      Key Strengths
                    </p>
                    <p className="text-foreground mt-1 font-medium">
                      {profile.strengths?.slice(0, 2).join(", ") || "Not set"}
                    </p>
                  </div>
                </div>
              </div>
              <Link href="/onboarding">
                <Button variant="outline" size="sm">
                  Update Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Career Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {careers.map((career, index) => (
          <Card key={career.id} variant="interactive" className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-1 text-xs font-medium">
                  {career.category}
                </span>
                <div className="text-primary flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">{career.demandScore}% Demand</span>
                </div>
              </div>
              <CardTitle className="mt-2 text-xl">{career.title}</CardTitle>
              <CardDescription>{career.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-xs">Average Salary</p>
                  <p className="text-foreground font-medium">{career.averageSalary}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Growth Outlook</p>
                  <p className="text-foreground font-medium">{career.growthOutlook}</p>
                </div>
              </div>

              {/* Skills */}
              <div>
                <p className="text-muted-foreground mb-2 text-xs">Required Skills</p>
                <div className="flex flex-wrap gap-1">
                  {career.skills.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="bg-muted text-muted-foreground rounded-full px-2 py-1 text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Education Path */}
              <div>
                <p className="text-muted-foreground mb-2 text-xs">Education Path</p>
                <div className="flex items-center gap-2">
                  <GraduationCap className="text-primary h-4 w-4" />
                  <span className="text-foreground text-sm">{career.educationPath[0]}</span>
                </div>
              </div>

              {/* Action */}
              <div className="pt-2">
                <Link href={`/courses?career=${career.id}`}>
                  <Button fullWidth variant="outline" rightIcon={<Briefcase className="h-4 w-4" />}>
                    View Related Courses
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

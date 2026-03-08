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
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Search,
  Filter,
  Building2,
  Star,
  ExternalLink,
} from "lucide-react";

export default async function JobsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Get user's certificates to check eligibility
  const [certificates, applications, jobs] = await Promise.all([
    db.certificate.findMany({
      where: { userId: session.user.id },
      include: { course: true },
    }),
    db.jobApplication.findMany({
      where: { userId: session.user.id },
      include: {
        job: {
          include: { company: true },
        },
      },
      orderBy: { appliedAt: "desc" },
    }),
    db.job.findMany({
      where: { isActive: true },
      include: {
        company: true,
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const hasCertificates = certificates.length > 0;
  const appliedJobIds = new Set(applications.map((a) => a.jobId));

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    REVIEWED: "bg-blue-100 text-blue-800",
    INTERVIEW: "bg-purple-100 text-purple-800",
    ACCEPTED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-foreground text-3xl font-bold">Job Opportunities</h1>
          <p className="text-muted-foreground mt-1">
            Find your next career opportunity with our partner companies
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex w-full items-center gap-3 lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search jobs..."
              className="border-border bg-card focus:ring-primary h-10 w-full rounded-xl border pr-4 pl-10 text-sm focus:ring-2 focus:outline-none"
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Eligibility Notice */}
      {!hasCertificates && (
        <Card className="from-tertiary to-tertiary/50 border-0 bg-gradient-to-r">
          <CardContent className="py-6">
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <Mascot size="md" mood="thinking" animate={false} />
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-foreground font-semibold">Get Certified to Apply</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Complete courses and earn certificates to become eligible for job applications.
                  Certified students get priority consideration from our partner companies.
                </p>
              </div>
              <Link href="/courses">
                <Button>Browse Courses</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Applications */}
      {applications.length > 0 && (
        <div>
          <h2 className="text-foreground mb-4 text-xl font-semibold">My Applications</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {applications.slice(0, 3).map((application) => (
              <Card key={application.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-secondary flex h-10 w-10 items-center justify-center rounded-lg">
                        {application.job.company.logo ? (
                          <img
                            src={application.job.company.logo}
                            alt={application.job.company.name}
                            className="h-full w-full rounded-lg object-cover"
                          />
                        ) : (
                          <Building2 className="text-primary h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-foreground font-medium">{application.job.title}</p>
                        <p className="text-muted-foreground text-sm">
                          {application.job.company.name}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${statusColors[application.status]}`}
                    >
                      {application.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-3 text-xs">
                    Applied {new Date(application.appliedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {applications.length > 3 && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm">
                View All Applications ({applications.length})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Job Listings */}
      <div>
        <h2 className="text-foreground mb-4 text-xl font-semibold">Available Positions</h2>

        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Mascot size="lg" mood="thinking" animate={false} />
              <h3 className="text-foreground mt-4 font-semibold">No Jobs Available</h3>
              <p className="text-muted-foreground mt-2">Check back soon for new opportunities!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => {
              const hasApplied = appliedJobIds.has(job.id);

              return (
                <Card key={job.id} variant="interactive" className="p-4">
                  <CardContent className="py-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      {/* Company logo */}
                      <div className="bg-secondary flex h-14 w-14 shrink-0 items-center justify-center rounded-xl">
                        {job.company.logo ? (
                          <img
                            src={job.company.logo}
                            alt={job.company.name}
                            className="h-full w-full rounded-xl object-cover"
                          />
                        ) : (
                          <Building2 className="text-primary h-7 w-7" />
                        )}
                      </div>

                      {/* Job info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-foreground text-lg font-semibold">{job.title}</h3>
                              {job.isDirectPlacement && (
                                <span className="bg-primary/10 text-primary flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
                                  <Star className="h-3 w-3" />
                                  Direct Placement
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground">
                              {job.company.name}
                              {job.company.isPartner && (
                                <span className="text-primary ml-1">• Partner</span>
                              )}
                            </p>
                          </div>
                          {hasApplied ? (
                            <span className="text-muted-foreground text-sm">Applied</span>
                          ) : (
                            <Link href={`/jobs/${job.slug}`}>
                              <Button size="sm" rightIcon={<ExternalLink className="h-4 w-4" />}>
                                View Details
                              </Button>
                            </Link>
                          )}
                        </div>

                        {/* Job details */}
                        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-4 text-sm">
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {job.location}
                            </span>
                          )}
                          {job.jobType && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {job.jobType}
                            </span>
                          )}
                          {job.salaryRange && (
                            <span className="flex items-center gap-3">
                              {/* <span className="h-4 w-4" >
                                NLe
                              </span> */}
                              {job.salaryRange}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            {job._count.applications} applicants
                          </span>
                        </div>

                        {/* Required skills */}
                        {job.requiredSkills.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {job.requiredSkills.slice(0, 4).map((skill) => (
                              <span
                                key={skill}
                                className="bg-muted text-muted-foreground rounded-full px-2 py-1 text-xs"
                              >
                                {skill}
                              </span>
                            ))}
                            {job.requiredSkills.length > 4 && (
                              <span className="bg-muted text-muted-foreground rounded-full px-2 py-1 text-xs">
                                +{job.requiredSkills.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import { db } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import {
  Users,
  BookOpen,
  Award,
  Briefcase,
  TrendingUp,
  UserPlus,
  GraduationCap,
  FileCheck,
} from "lucide-react";
import { AdminNotifications } from "@/components/admin/admin-notifications";
import Link from "next/link";

export default async function AdminDashboardPage() {
  // Get stats
  const [
    totalUsers,
    totalCourses,
    totalCertificates,
    totalJobs,
    recentUsers,
    recentCertificates,
    enrollmentStats,
  ] = await Promise.all([
    db.user.count(),
    db.course.count(),
    db.certificate.count(),
    db.job.count({ where: { isActive: true } }),
    db.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, createdAt: true, role: true },
    }),
    db.certificate.findMany({
      take: 5,
      orderBy: { issueDate: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
    }),
    db.enrollment.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  const stats = [
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
      color: "bg-blue-500",
      href: "/admin/users",
    },
    {
      title: "Total Courses",
      value: totalCourses,
      icon: BookOpen,
      color: "bg-green-500",
      href: "/admin/courses",
    },
    {
      title: "Certificates Issued",
      value: totalCertificates,
      icon: Award,
      color: "bg-yellow-500",
      href: "/admin/certificates",
    },
    {
      title: "Active Jobs",
      value: totalJobs,
      icon: Briefcase,
      color: "bg-purple-500",
      href: "/admin/jobs",
    },
  ];


  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-foreground text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of the Lana platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card variant="interactive">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">{stat.title}</p>
                    <p className="text-foreground mt-1 text-3xl font-bold">
                      {stat.value.toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`h-12 w-12 rounded-xl ${stat.color} flex items-center justify-center`}
                  >
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="text-primary h-5 w-5" />
              Recent Users
            </CardTitle>
            <Link href="/admin/users" className="text-primary text-sm hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary flex h-10 w-10 items-center justify-center rounded-full">
                      <span className="text-secondary-foreground text-sm font-bold">
                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-foreground font-medium">{user.name || "No name"}</p>
                      <p className="text-muted-foreground text-sm">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        user.role === "ADMIN"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {user.role}
                    </span>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Certificates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="text-primary h-5 w-5" />
              Recent Certificates
            </CardTitle>
            <Link href="/admin/certificates" className="text-primary text-sm hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCertificates.length > 0 ? (
                recentCertificates.map((cert) => (
                  <div key={cert.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-foreground font-medium">{cert.user.name}</p>
                      <p className="text-muted-foreground text-sm">{cert.course.title}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          cert.level === "PLATINUM"
                            ? "bg-purple-100 text-purple-800"
                            : cert.level === "GOLD"
                              ? "bg-yellow-100 text-yellow-800"
                              : cert.level === "SILVER"
                                ? "bg-slate-100 text-slate-800"
                                : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {cert.level}
                      </span>
                      <p className="text-muted-foreground mt-1 text-xs">{cert.examScore}%</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground py-4 text-center">No certificates issued yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enrollment Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="text-primary h-5 w-5" />
              Enrollment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {enrollmentStats.map((stat) => (
                <div key={stat.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        stat.status === "COMPLETED"
                          ? "bg-success"
                          : stat.status === "ACTIVE"
                            ? "bg-primary"
                            : stat.status === "PAUSED"
                              ? "bg-warning"
                              : "bg-muted"
                      }`}
                    />
                    <span className="text-foreground">{stat.status}</span>
                  </div>
                  <span className="text-foreground font-bold">{stat._count}</span>
                </div>
              ))}
              {enrollmentStats.length === 0 && (
                <p className="text-muted-foreground py-4 text-center">No enrollments yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="text-primary h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/admin/courses/new"
                className="bg-primary/5 hover:bg-primary/10 rounded-xl p-4 text-center transition-colors"
              >
                <BookOpen className="text-primary mx-auto mb-2 h-8 w-8" />
                <p className="text-foreground text-sm font-medium">Add Course</p>
              </Link>
              <Link
                href="/admin/jobs/new"
                className="bg-primary/5 hover:bg-primary/10 rounded-xl p-4 text-center transition-colors"
              >
                <Briefcase className="text-primary mx-auto mb-2 h-8 w-8" />
                <p className="text-foreground text-sm font-medium">Add Job</p>
              </Link>
              <Link
                href="/admin/users"
                className="bg-primary/5 hover:bg-primary/10 rounded-xl p-4 text-center transition-colors"
              >
                <Users className="text-primary mx-auto mb-2 h-8 w-8" />
                <p className="text-foreground text-sm font-medium">Manage Users</p>
              </Link>
              <Link
                href="/admin/certificates"
                className="bg-primary/5 hover:bg-primary/10 rounded-xl p-4 text-center transition-colors"
              >
                <FileCheck className="text-primary mx-auto mb-2 h-8 w-8" />
                <p className="text-foreground text-sm font-medium">Verify Certs</p>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Admin Notifications */}
        <AdminNotifications />
      </div>
    </div>
  );
}

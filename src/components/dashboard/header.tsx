"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Bell, Menu, X, LogOut, User, Settings, ChevronDown } from "lucide-react";
import { GlobalSearch } from "./global-search";

interface DashboardHeaderProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);
  const notificationsRef = React.useRef<HTMLDivElement>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = React.useState(false);
  const [notifications, setNotifications] = React.useState<
    {
      id: string;
      type: string;
      title: string;
      message: string;
      link?: string | null;
      read: boolean;
      readAt: string | null;
      createdAt: string;
    }[]
  >([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  // Close profile dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }

      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadNotifications = React.useCallback(async () => {
    try {
      setIsLoadingNotifications(true);
      const response = await fetch("/api/notifications");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  React.useEffect(() => {
    // Load notifications when the dashboard header mounts
    loadNotifications();
  }, [loadNotifications]);

  const handleNotificationClick = async (notification: {
    id: string;
    link?: string | null;
    read: boolean;
  }) => {
    if (!notification.read) {
      try {
        await fetch(`/api/notifications/${notification.id}/read`, {
          method: "POST",
        });

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: true, readAt: new Date().toISOString() } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    if (notification.link) {
      setIsNotificationsOpen(false);
      router.push(notification.link);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="border-border bg-card sticky top-0 z-40 w-full border-b">
      <div className="flex h-16 items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <button
            className="hover:bg-muted rounded-lg p-2 lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/lana_logo.jpg"
              alt="Lana Logo"
              width={72}
              height={72}
              className="object-contain"
              priority
            />
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mx-8 hidden max-w-md flex-1 md:flex">
          <GlobalSearch />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              className="hover:bg-muted relative rounded-lg p-2"
              onClick={() => {
                setIsNotificationsOpen((prev) => !prev);
                if (!isNotificationsOpen && notifications.length === 0) {
                  // Lazy-load notifications if we don't have any yet
                  loadNotifications();
                }
              }}
              aria-label="Notifications"
            >
              <Bell className="text-muted-foreground h-5 w-5" />
              {unreadCount > 0 && (
                <span className="bg-destructive absolute top-1 right-1 h-2 w-2 rounded-full" />
              )}
            </button>
            {isNotificationsOpen && (
              <div className="border-border bg-card animate-fade-in absolute right-0 mt-2 w-80 rounded-xl border shadow-lg">
                <div className="border-border border-b px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-foreground text-sm font-medium">Notifications</p>
                    {unreadCount > 0 && (
                      <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto px-1 py-2">
                  {isLoadingNotifications ? (
                    <p className="text-muted-foreground px-3 py-2 text-sm">Loading...</p>
                  ) : notifications.length === 0 ? (
                    <p className="text-muted-foreground px-3 py-2 text-sm">
                      You have no notifications yet.
                    </p>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <button
                        key={notification.id}
                        className={cn(
                          "hover:bg-muted/70 flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left text-sm",
                          !notification.read ? "bg-primary/5" : ""
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <span className="text-foreground font-medium">
                          {notification.title || "Notification"}
                        </span>
                        <span className="text-muted-foreground line-clamp-2 text-xs">
                          {notification.message}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="hover:bg-muted flex items-center gap-2 rounded-lg p-1.5"
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name || "User"}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white">
                  {getInitials(user.name)}
                </div>
              )}
              <ChevronDown
                className={cn(
                  "text-muted-foreground hidden h-4 w-4 transition-transform sm:block",
                  isProfileOpen && "rotate-180"
                )}
              />
            </button>

            {/* Dropdown menu */}
            {isProfileOpen && (
              <div className="border-border bg-card animate-fade-in absolute right-0 mt-2 w-56 rounded-xl border shadow-lg">
                <div className="border-border border-b p-3">
                  <p className="text-foreground truncate font-medium">{user.name}</p>
                  <p className="text-muted-foreground truncate text-sm">{user.email}</p>
                </div>
                <div className="p-2">
                  <Link
                    href="/profile"
                    className="hover:bg-muted flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="hover:bg-muted flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </div>
                <div className="border-border border-t p-2">
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="hover:bg-muted text-destructive flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="border-border bg-card animate-slide-up border-t lg:hidden">
          <div className="space-y-4 p-4">
            {/* Mobile search */}
            <div className="w-full">
              <GlobalSearch />
            </div>

            {/* Mobile nav links */}
            <nav className="space-y-1">
              <MobileNavLink href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                Dashboard
              </MobileNavLink>
              <MobileNavLink href="/courses" onClick={() => setIsMobileMenuOpen(false)}>
                Courses
              </MobileNavLink>
              <MobileNavLink href="/careers" onClick={() => setIsMobileMenuOpen(false)}>
                Careers
              </MobileNavLink>
              <MobileNavLink href="/certificates" onClick={() => setIsMobileMenuOpen(false)}>
                Certificates
              </MobileNavLink>
              <MobileNavLink href="/jobs" onClick={() => setIsMobileMenuOpen(false)}>
                Jobs
              </MobileNavLink>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

function MobileNavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-muted text-foreground block rounded-lg px-4 py-2"
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

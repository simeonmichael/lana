"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, BookOpen, Briefcase, Compass, Loader2, ArrowRight } from "lucide-react";

interface SearchResults {
  courses: Array<{
    id: string;
    title: string;
    slug: string;
    description: string;
    level: string;
    duration: number;
    topicCount: number;
  }>;
  careers: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
  }>;
  jobs: Array<{
    id: string;
    title: string;
    slug: string;
    companyName: string;
    location?: string;
  }>;
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [results, setResults] = React.useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  const hasResults =
    results &&
    (results.courses.length > 0 || results.careers.length > 0 || results.jobs.length > 0);
  const isEmpty = results && !hasResults && query.length >= 2;

  const search = React.useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setResults(data.data);
      } else {
        setResults({ courses: [], careers: [], jobs: [] });
      }
    } catch {
      setResults({ courses: [], careers: [], jobs: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    debounceRef.current = setTimeout(() => {
      search(value);
      debounceRef.current = null;
    }, 250);
  };

  const handleFocus = () => {
    if (query.length >= 2 && results !== undefined) {
      setIsOpen(true);
    } else if (query.length >= 2) {
      setIsOpen(true);
      search(query);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on result
    setTimeout(() => setIsOpen(false), 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Enter" && query.trim()) {
      router.push(`/courses?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <input
        type="text"
        placeholder="Search courses, careers, jobs..."
        value={query}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="border-border bg-background focus:ring-primary h-10 w-full rounded-xl border pr-4 pl-10 text-sm focus:ring-2 focus:outline-none"
      />

      {isOpen && query.length >= 2 && (
        <div className="border-border bg-card absolute top-full right-0 left-0 z-50 mt-2 max-h-[min(400px,70vh)] overflow-y-auto rounded-xl border shadow-lg">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="text-primary h-5 w-5 animate-spin" />
              <span className="text-muted-foreground text-sm">Searching...</span>
            </div>
          ) : isEmpty ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm">
                No results found for &quot;{query}&quot;
              </p>
              <Link
                href={`/courses?q=${encodeURIComponent(query)}`}
                className="text-primary mt-2 inline-flex items-center gap-1 text-sm font-medium hover:underline"
              >
                Search all courses <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="p-2">
              {results?.courses && results.courses.length > 0 && (
                <div className="mb-2">
                  <p className="text-muted-foreground mb-1 px-2 py-1 text-xs font-semibold uppercase">
                    Courses
                  </p>
                  {results.courses.map((c) => (
                    <Link
                      key={c.id}
                      href={`/courses/${c.slug}`}
                      className="hover:bg-muted flex items-center gap-3 rounded-lg px-3 py-2 transition-colors"
                    >
                      <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                        <BookOpen className="text-primary h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate font-medium">{c.title}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {c.topicCount} topics • {c.duration}h
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {results?.careers && results.careers.length > 0 && (
                <div className="mb-2">
                  <p className="text-muted-foreground mb-1 px-2 py-1 text-xs font-semibold uppercase">
                    Careers
                  </p>
                  {results.careers.map((c) => (
                    <Link
                      key={c.id}
                      href={`/careers?q=${encodeURIComponent(c.title)}`}
                      className="hover:bg-muted flex items-center gap-3 rounded-lg px-3 py-2 transition-colors"
                    >
                      <div className="bg-secondary/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                        <Compass className="text-primary h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate font-medium">{c.title}</p>
                        <p className="text-muted-foreground truncate text-xs">{c.category}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {results?.jobs && results.jobs.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1 px-2 py-1 text-xs font-semibold uppercase">
                    Jobs
                  </p>
                  {results.jobs.map((j) => (
                    <Link
                      key={j.id}
                      href={`/jobs/${j.slug}`}
                      className="hover:bg-muted flex items-center gap-3 rounded-lg px-3 py-2 transition-colors"
                    >
                      <div className="bg-tertiary/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                        <Briefcase className="text-primary h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate font-medium">{j.title}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {j.companyName}
                          {j.location ? ` • ${j.location}` : ""}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <Link
                href={`/courses?q=${encodeURIComponent(query)}`}
                className="text-primary hover:bg-muted mt-2 flex items-center justify-center gap-1 rounded-lg py-2 text-sm font-medium transition-colors"
              >
                View all results <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

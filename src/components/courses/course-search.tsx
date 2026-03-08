"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function CourseSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState(searchParams.get("q") ?? "");

  const debouncedSearch = React.useRef<NodeJS.Timeout | null>(null);
  const lastPushedValue = React.useRef<string | null>(null);

  // Sync from URL when it changes externally (e.g. browser back)
  React.useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (current !== lastPushedValue.current) {
      setQuery(current);
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debouncedSearch.current) {
      clearTimeout(debouncedSearch.current);
    }

    debouncedSearch.current = setTimeout(() => {
      const trimmed = value.trim();
      lastPushedValue.current = trimmed;
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
      router.push(`/courses?${params.toString()}`);
      debouncedSearch.current = null;
    }, 300);
  };

  return (
    <div className="relative flex-1 lg:w-64">
      <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <input
        type="text"
        placeholder="Search courses..."
        value={query}
        onChange={handleChange}
        className="border-border bg-card focus:ring-primary h-10 w-full rounded-xl border pr-4 pl-10 text-sm focus:ring-2 focus:outline-none"
      />
    </div>
  );
}

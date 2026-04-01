import { useFetcher } from "react-router";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

// ─── StarDisplay ───
// Read-only star display with half-star support and rating count.

interface StarDisplayProps {
  averageRating: number | null;
  ratingCount: number;
  className?: string;
}

export function StarDisplay({ averageRating, ratingCount, className }: StarDisplayProps) {
  if (averageRating === null || ratingCount === 0) {
    return (
      <span className={`flex items-center gap-1 text-sm text-muted-foreground ${className ?? ""}`}>
        <span className="flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="size-4 text-muted-foreground/40" />
          ))}
        </span>
        <span>No ratings yet</span>
      </span>
    );
  }

  // Round to nearest 0.5
  const rounded = Math.round(averageRating * 2) / 2;
  const fullStars = Math.floor(rounded);
  const hasHalf = rounded % 1 !== 0;

  return (
    <span className={`flex items-center gap-1 text-sm ${className ?? ""}`}>
      <span className="flex">
        {Array.from({ length: 5 }).map((_, i) => {
          if (i < fullStars) {
            return <Star key={i} className="size-4 fill-amber-400 text-amber-400" />;
          }
          if (i === fullStars && hasHalf) {
            return (
              <span key={i} className="relative size-4">
                <Star className="absolute size-4 text-muted-foreground/40" />
                <span className="absolute overflow-hidden" style={{ width: "50%" }}>
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                </span>
              </span>
            );
          }
          return <Star key={i} className="size-4 text-muted-foreground/40" />;
        })}
      </span>
      <span className="font-medium text-foreground">{averageRating.toFixed(1)}</span>
      <span className="text-muted-foreground">({ratingCount})</span>
    </span>
  );
}

// ─── StarInput ───
// Interactive rating widget for enrolled students. Uses useFetcher to avoid page reload.

interface StarInputProps {
  courseId: number;
  userRating: number | null;
  actionPath: string;
}

export function StarInput({ courseId, userRating, actionPath }: StarInputProps) {
  const fetcher = useFetcher();
  const prevState = useRef(fetcher.state);

  useEffect(() => {
    if (prevState.current === "submitting" && fetcher.state === "idle") {
      if (fetcher.data?.ok) {
        toast.success("Rating saved!");
      }
    }
    prevState.current = fetcher.state;
  }, [fetcher.state, fetcher.data]);

  const optimisticRating =
    fetcher.state !== "idle"
      ? Number(fetcher.formData?.get("rating"))
      : (userRating ?? 0);

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">
        {userRating ? "Your Rating" : "Rate this Course"}
      </p>
      <fetcher.Form method="post" action={actionPath} className="flex gap-0.5">
        <input type="hidden" name="intent" value="rate" />
        {Array.from({ length: 5 }).map((_, i) => {
          const value = i + 1;
          const filled = value <= optimisticRating;
          return (
            <button
              key={value}
              type="submit"
              name="rating"
              value={value}
              aria-label={`Rate ${value} star${value !== 1 ? "s" : ""}`}
              className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Star
                className={`size-6 transition-colors ${
                  filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40 hover:text-amber-300"
                }`}
              />
            </button>
          );
        })}
      </fetcher.Form>
    </div>
  );
}

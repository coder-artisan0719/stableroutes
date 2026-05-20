import { cn } from "@/lib/utils";

// Trustpilot brand colors.
const TP_GREEN = "#00B67A";
const TP_GREY = "#DCDCE6";
const TP_DARK = "#191919";

function Star({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={style}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2.5l2.9 6.27 6.85.6-5.18 4.5 1.55 6.7L12 17.6l-6.12 3.47 1.55-6.7-5.18-4.5 6.85-.6L12 2.5z" />
    </svg>
  );
}

/** A row of Trustpilot-style star tiles, filled green to match `rating`. */
function StarTiles({ rating, tile }: { rating: number; tile: number }) {
  return (
    <div className="flex gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <div
            key={i}
            className="relative shrink-0"
            style={{ width: tile, height: tile }}
          >
            {/* empty (grey) tile */}
            <div
              className="absolute inset-0 grid place-items-center"
              style={{ background: TP_GREY }}
            >
              <Star className="text-white" />
            </div>
            {/* green fill, clipped to the rating fraction */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <div
                className="grid place-items-center"
                style={{ width: tile, height: tile, background: TP_GREEN }}
              >
                <Star className="text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrustpilotWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Star className="h-4 w-4" style={{ color: TP_GREEN }} />
      <span
        className="font-semibold tracking-tight"
        style={{ color: "inherit" }}
      >
        Trustpilot
      </span>
    </span>
  );
}

/**
 * Trustpilot rating display. `compact` renders a single inline row;
 * the default renders the full stacked badge.
 */
export function TrustpilotRating({
  rating = 4.8,
  reviews = 1284,
  compact = false,
  className,
}: {
  rating?: number;
  reviews?: number;
  compact?: boolean;
  className?: string;
}) {
  const label =
    rating >= 4.3
      ? "Excellent"
      : rating >= 3.5
        ? "Great"
        : rating >= 2.5
          ? "Average"
          : "Poor";

  if (compact) {
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        <StarTiles rating={rating} tile={18} />
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{rating}</span> on
        </span>
        <TrustpilotWordmark className="text-sm text-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{label}</span>
        <TrustpilotWordmark className="text-sm text-foreground" />
      </div>
      <StarTiles rating={rating} tile={32} />
      <p className="text-xs text-muted-foreground">
        TrustScore <span className="font-semibold text-foreground">{rating}</span>{" "}
        · {reviews.toLocaleString()} reviews
      </p>
    </div>
  );
}

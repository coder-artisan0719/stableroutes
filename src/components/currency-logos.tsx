import { cn } from "@/lib/utils";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "USDC";

const CONFIG: Record<
  CurrencyCode,
  { symbol: string; label: string; gradient: string }
> = {
  USD: {
    symbol: "$",
    label: "US Dollar",
    gradient: "from-emerald-500 to-green-600",
  },
  EUR: {
    symbol: "€",
    label: "Euro",
    gradient: "from-blue-500 to-indigo-600",
  },
  GBP: {
    symbol: "£",
    label: "British Pound",
    gradient: "from-violet-500 to-purple-600",
  },
  CAD: {
    symbol: "C$",
    label: "Canadian Dollar",
    gradient: "from-red-500 to-rose-600",
  },
  USDC: {
    symbol: "$",
    label: "USD Coin",
    gradient: "from-[#2775CA] to-[#1a5fa8]",
  },
};

const SIZES = {
  sm: "h-8 w-8 text-xs",
  default: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

/** A circular, brand-colored badge for a currency. */
export function CurrencyBadge({
  code,
  size = "default",
  className,
}: {
  code: CurrencyCode;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const c = CONFIG[code];
  return (
    <span
      aria-label={c.label}
      title={c.label}
      className={cn(
        "inline-grid place-items-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ring-2 ring-background",
        c.gradient,
        SIZES[size],
        className,
      )}
    >
      {code === "USDC" ? (
        <span className="flex flex-col items-center leading-none">
          <span>{c.symbol}</span>
          <span className="mt-[1px] text-[6px] font-semibold tracking-wider">
            USDC
          </span>
        </span>
      ) : (
        c.symbol
      )}
    </span>
  );
}

/** Overlapping cluster of currency badges. */
export function CurrencyCluster({
  codes,
  size = "default",
  className,
}: {
  codes: CurrencyCode[];
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center", className)}>
      {codes.map((code, i) => (
        <div key={code} className={i > 0 ? "-ml-2.5" : ""} style={{ zIndex: codes.length - i }}>
          <CurrencyBadge code={code} size={size} />
        </div>
      ))}
    </div>
  );
}

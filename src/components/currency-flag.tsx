import US from "country-flag-icons/react/3x2/US";
import EU from "country-flag-icons/react/3x2/EU";
import GB from "country-flag-icons/react/3x2/GB";
import CA from "country-flag-icons/react/3x2/CA";
import { cn } from "@/lib/utils";

export type AccountCurrency = "USD" | "EUR" | "GBP" | "CAD";

export const ACCOUNT_CURRENCIES: AccountCurrency[] = ["USD", "EUR", "GBP", "CAD"];

type CurrencyMeta = {
  Flag: typeof US;
  label: string;
  symbol: string;
  rail: string;
};

const CURRENCY: Record<AccountCurrency, CurrencyMeta> = {
  USD: { Flag: US, label: "US Dollar", symbol: "$", rail: "ACH + Wire" },
  EUR: { Flag: EU, label: "Euro", symbol: "€", rail: "SEPA" },
  GBP: { Flag: GB, label: "British Pound", symbol: "£", rail: "Faster Payments" },
  CAD: { Flag: CA, label: "Canadian Dollar", symbol: "C$", rail: "EFT + Interac" },
};

export function currencyMeta(code: AccountCurrency) {
  return CURRENCY[code];
}

const SIZE = {
  sm: "w-4",
  default: "w-5",
  lg: "w-7",
} as const;

/** A rounded country flag for an account currency. */
export function CurrencyFlag({
  code,
  size = "default",
  className,
}: {
  code: AccountCurrency;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const { Flag, label } = CURRENCY[code];
  return (
    <Flag
      title={label}
      className={cn(
        "inline-block h-auto rounded-[2px] ring-1 ring-black/10",
        SIZE[size],
        className,
      )}
    />
  );
}

/** Flag + currency code, e.g. 🇺🇸 USD — for inline display. */
export function CurrencyFlagLabel({
  code,
  size = "default",
  withName = false,
  className,
}: {
  code: AccountCurrency;
  size?: keyof typeof SIZE;
  withName?: boolean;
  className?: string;
}) {
  const meta = CURRENCY[code];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <CurrencyFlag code={code} size={size} />
      <span className="font-medium">{code}</span>
      {withName && (
        <span className="text-muted-foreground">· {meta.label}</span>
      )}
    </span>
  );
}

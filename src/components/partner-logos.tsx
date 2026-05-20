import { cn } from "@/lib/utils";

// Stylized wordmark logos. These are intentionally typographic
// representations (not raster art) so they degrade well in dark mode
// and don't require image hosting.

export function VisaLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-serif text-2xl font-bold italic tracking-tight text-[#1A1F71] dark:text-[#9aa6ff]",
        className,
      )}
    >
      VISA
    </span>
  );
}

export function MastercardLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label="Mastercard"
    >
      <span className="relative inline-block h-6 w-10">
        <span className="absolute left-0 top-0 h-6 w-6 rounded-full bg-[#EB001B]" />
        <span className="absolute right-0 top-0 h-6 w-6 rounded-full bg-[#F79E1B] mix-blend-multiply dark:mix-blend-screen" />
      </span>
      <span className="text-xs font-bold uppercase tracking-wider text-foreground/80">
        mastercard
      </span>
    </span>
  );
}

export function AmExLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-[#006FCF] px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-white",
        className,
      )}
    >
      <span className="hidden sm:inline">American&nbsp;Express</span>
      <span className="sm:hidden">AmEx</span>
    </span>
  );
}

export function StripeLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-sans text-xl font-bold tracking-tight text-[#635BFF]",
        className,
      )}
    >
      stripe
    </span>
  );
}

export function LeadBankLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 font-serif text-lg font-bold tracking-tight text-foreground",
        className,
      )}
    >
      <span className="text-[#0F4C81] dark:text-[#7eb4e8]">Lead</span>
      <span className="text-muted-foreground/80">Bank</span>
    </span>
  );
}

export function GooglePayLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label="Google Pay"
    >
      <span className="font-sans text-base font-medium tracking-tight">
        <span className="text-[#4285F4]">G</span>
        <span className="text-[#EA4335]">o</span>
        <span className="text-[#FBBC05]">o</span>
        <span className="text-[#4285F4]">g</span>
        <span className="text-[#34A853]">l</span>
        <span className="text-[#EA4335]">e</span>
      </span>
      <span className="text-base font-medium text-muted-foreground">Pay</span>
    </span>
  );
}

export function CircleUsdcLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label="USDC"
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#2775CA] text-[10px] font-bold text-white">
        $
      </span>
      <span className="text-sm font-semibold tracking-tight text-foreground">
        USDC
      </span>
    </span>
  );
}

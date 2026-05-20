import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().min(2, "Name is too short").max(80),
    email: z.string().email().max(160),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirm: z.string().min(8).max(128),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const passwordUpdateSchema = z
  .object({
    current: z.string().min(1),
    next: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirm: z.string().min(8).max(128),
  })
  .refine((v) => v.next === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().email(),
    code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirm: z.string().min(8).max(128),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

// Loose check for a USDC (Base) recipient address — EVM-style 0x + 40 hex chars.
const evmAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid Base (EVM) address");

// Customer creates a profile: full name + sender + account currency +
// withdrawal address. Bank details come later from admin at approval time.
export const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(60),
  lastName: z.string().min(1, "Last name is required").max(60),
  senderName: z.string().min(1, "Sender name is required").max(120),
  accountCurrency: z.enum(["USD", "EUR", "GBP", "CAD"]),
  withdrawalAddress: evmAddress,
});

// Customer edit on a PENDING profile: same fields as create (all editable).
export const profilePendingUpdateSchema = profileSchema.partial();

// Customer edit on an APPROVED profile: only sender + withdrawal address.
// Full name, account currency, and bank details are locked.
export const profileApprovedUpdateSchema = z.object({
  senderName: z.string().min(1, "Sender name is required").max(120).optional(),
  withdrawalAddress: evmAddress.optional(),
});

// Bank details assigned by admin on approval.
export const bankDetailsSchema = z.object({
  bankName: z.string().min(1, "Bank name is required").max(120),
  bankAddress: z.string().min(1, "Bank address is required").max(240),
  accountNumber: z
    .string()
    .min(4, "Account number is too short")
    .max(34)
    .regex(/^[0-9-]+$/, "Use digits only (dashes allowed)"),
  routingNumber: z
    .string()
    .regex(/^\d{9}$/, "Routing number must be exactly 9 digits"),
  transferMethod: z.enum(["ACH", "WIRE", "BOTH"]),
});

export type BankDetailsInput = z.infer<typeof bankDetailsSchema>;

export const transactionCreateSchema = z.object({
  profileId: z.string().min(1),
  amountCents: z.number().int().positive().max(10_000_000_00),
  type: z.enum(["ACH", "WIRE"]),
  senderName: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
});

// Admin-side create: same fields plus an optional internal note + optional
// scheduled-for datetime. The commission rate is inherited from the profile,
// not set per transaction. If `scheduledFor` is in the future the status is
// stored as SCHEDULED; otherwise it's an immediate PENDING.
export const adminTransactionCreateSchema = transactionCreateSchema.extend({
  adminNote: z.string().max(500).optional(),
  scheduledFor: z.coerce.date().optional(),
});

// Admin blocks / unblocks a customer account.
export const blockCustomerSchema = z.object({
  id: z.string().min(1),
  blocked: z.boolean(),
  reason: z.string().max(500).optional(),
});
export type AdminTransactionCreateInput = z.infer<
  typeof adminTransactionCreateSchema
>;

// EVM transaction hash: 0x + 64 hex chars.
const evmTxHash = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Tx hash must be 0x followed by 64 hex chars");

export const transactionStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["SCHEDULED", "PENDING", "COMPLETED", "REFUNDED"]),
  refundReason: z.string().max(500).optional(),
  adminNote: z.string().max(500).optional(),
  txHash: evmTxHash.optional(),
});

// Admin moves a profile to APPROVED → bank details required.
// Admin moves a profile to PENDING or REJECTED → notes only (REJECTED notes
// double as the reason shown to the customer).
export const profileApprovalSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("APPROVED"),
    id: z.string().min(1),
    notes: z.string().max(500).optional(),
    commissionPct: z.number().int().min(0).max(100),
    bank: bankDetailsSchema,
  }),
  z.object({
    status: z.literal("PENDING"),
    id: z.string().min(1),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    status: z.literal("REJECTED"),
    id: z.string().min(1),
    notes: z.string().max(500).optional(),
  }),
]);

export type SignupInput = z.infer<typeof signupSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;

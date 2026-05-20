// Seeded knowledge base for the homepage chatbot. Each item is matched against
// the user's question by simple keyword scoring. Server-side only — keeps the
// rules in one place and easy to extend later with a real LLM provider.

export type ChatTopic = {
  id: string;
  keywords: string[];
  question: string; // suggested phrasing (used for quick-reply chips)
  answer: string;
};

export const TOPICS: ChatTopic[] = [
  {
    id: "what-is",
    keywords: ["what", "is", "stableroute", "about", "service", "do"],
    question: "What is StableRoute?",
    answer:
      "StableRoute gives you a custom-named USD bank account that accepts ACH and Wire transfers. As soon as funds arrive, they're automatically converted to USDC on Base and routed to the wallet address you choose. Banking on the front end, stablecoin on the back end.",
  },
  {
    id: "how-fast",
    keywords: ["fast", "speed", "long", "minutes", "settlement", "settle", "time"],
    question: "How fast is settlement?",
    answer:
      "Once an incoming ACH or Wire clears at our partner bank, funds are typically converted to USDC and routed to your Base address in under 60 seconds. ACH originations from a sender can take 1–3 business days to clear; Wires usually clear same-day.",
  },
  {
    id: "fees",
    keywords: ["fee", "fees", "cost", "price", "pricing", "charge", "expensive"],
    question: "How much does it cost?",
    answer:
      "Starter is free for up to $10k/mo inbound. Growth is $49/mo for up to $250k/mo and 5 named profiles. Scale is custom for high-volume operators. Settlement to USDC is included on every plan — no per-transaction fee.",
  },
  {
    id: "is-bank",
    keywords: ["bank", "fdic", "regulated", "insurance", "insured"],
    question: "Is StableRoute a bank?",
    answer:
      "No. StableRoute is a financial-services platform. USD deposits are held at Lead Bank, an FDIC-insured partner institution, under a sponsor banking relationship. USDC is issued by Circle Internet Financial — cryptocurrency holdings are not FDIC- or SIPC-insured.",
  },
  {
    id: "profiles",
    keywords: ["profile", "profiles", "multiple", "many", "several", "account"],
    question: "Can I create multiple profiles?",
    answer:
      "Yes. Every customer can create multiple named profiles, each with its own sender name and USDC withdrawal address. Starter includes 1 profile, Growth 5, Scale unlimited. Editing a profile after approval is restricted to sender name and withdrawal address — the rest is locked for compliance.",
  },
  {
    id: "ach-wire",
    keywords: ["ach", "wire", "transfer", "deposit", "receive", "incoming"],
    question: "Do you support ACH and Wire?",
    answer:
      "Yes — both domestic ACH and US Wire transfers are supported on every named USD account. Senders just need your routing and account number, which appear in your dashboard once the profile is approved.",
  },
  {
    id: "usdc-base",
    keywords: ["usdc", "base", "crypto", "blockchain", "wallet", "address", "settle"],
    question: "Why USDC on Base?",
    answer:
      "USDC is a fully-reserved, regulated stablecoin issued by Circle. Base is an Ethereum L2 with sub-cent fees and 1-second confirmations. Together they give you a programmable, globally-portable dollar without the volatility of native crypto.",
  },
  {
    id: "approval-time",
    keywords: ["approve", "approval", "review", "wait", "long", "how"],
    question: "How long does approval take?",
    answer:
      "Most profiles are reviewed and approved within a few business hours by our compliance team. You'll receive an email the moment your USD account is provisioned and live, with the bank details to share with senders.",
  },
  {
    id: "withdrawal-address",
    keywords: ["address", "withdrawal", "change", "update", "edit", "modify"],
    question: "Can I change the withdrawal address?",
    answer:
      "Yes — you can update the withdrawal address from your dashboard. On approved profiles, the sender name and withdrawal address remain editable. Full name and bank details are locked once a profile is live.",
  },
  {
    id: "security",
    keywords: ["security", "secure", "safe", "encryption", "compliance", "audit"],
    question: "How secure is StableRoute?",
    answer:
      "We're SOC 2 Type II audited annually. All data is encrypted with TLS 1.3 in transit and AES-256 at rest. KYC/KYB and transaction monitoring run on every profile. Every USDC settlement is verifiable on-chain.",
  },
  {
    id: "signup",
    keywords: ["sign", "signup", "register", "start", "begin", "open", "create"],
    question: "How do I get started?",
    answer:
      "Click 'Get started' at the top of the page and create a free account. From your dashboard, add a profile with your business name, sender name, and USDC (Base) withdrawal address. Most accounts are approved within a few hours.",
  },
  {
    id: "card",
    keywords: ["card", "debit", "credit", "spend", "issue"],
    question: "Do you issue debit cards?",
    answer:
      "Debit card issuance (Visa) is on our Q3 2026 roadmap, along with spend controls and expense categories. Today we focus on the receive side — inbound USD to USDC.",
  },
];

// Lightweight scoring: count keyword matches, weighted by how distinctive each word is.
const STOPWORDS = new Set([
  "a","an","the","is","are","do","does","i","you","my","what","how","can","with","of","to","for","on","in","at","it","and","or","this","that","they","we",
]);

export function findBestAnswer(input: string): { topic: ChatTopic | null; score: number } {
  const tokens = input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));

  let best: ChatTopic | null = null;
  let bestScore = 0;
  for (const topic of TOPICS) {
    let score = 0;
    for (const tok of tokens) {
      if (topic.keywords.includes(tok)) score += 1;
      // Partial match bonus
      else if (topic.keywords.some((k) => k.includes(tok) || tok.includes(k))) score += 0.4;
    }
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }
  return { topic: best, score: bestScore };
}

export const FALLBACK_ANSWER =
  "I don't have a confident answer for that yet. For anything specific, tap the Telegram link above to chat live with a human — they usually reply within minutes. Or pick one of the suggested questions below.";

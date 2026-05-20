import { NextResponse } from "next/server";
import { findBestAnswer, FALLBACK_ANSWER, TOPICS } from "@/lib/chatbot-knowledge";

export const runtime = "nodejs";

const MIN_SCORE = 0.8;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = (body as { message?: unknown })?.message;
  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }
  if (message.length > 500) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const { topic, score } = findBestAnswer(message);
  const answer = topic && score >= MIN_SCORE ? topic.answer : FALLBACK_ANSWER;
  const matchedTopicId = topic && score >= MIN_SCORE ? topic.id : null;

  // Suggest 3 other topics for follow-ups.
  const suggestions = TOPICS.filter((t) => t.id !== matchedTopicId)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((t) => t.question);

  // Tiny artificial think-delay so the UI doesn't snap instantly.
  await new Promise((r) => setTimeout(r, 350));

  return NextResponse.json({
    answer,
    matchedTopicId,
    suggestions,
  });
}

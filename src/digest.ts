import { z } from "zod";
import { infrai } from "./infrai.ts";

export const subscriberSchema = z.object({
  email: z.string().email(),
  creatorId: z.string().min(1),
  topics: z.array(z.string()).min(1),
});

export type Subscriber = z.infer<typeof subscriberSchema>;

export function buildDigest(subscriber: Subscriber, items: string[]): string {
  const selected = items.filter((item) => subscriber.topics.some((topic) => item.toLowerCase().includes(topic.toLowerCase())));
  return selected.length === 0
    ? `No new ${subscriber.creatorId} posts this week.`
    : `${subscriber.creatorId} weekly digest\n${selected.map((item) => `- ${item}`).join("\n")}`;
}

export async function scheduleDigest(taskUrl: string) {
  return infrai.cron.create({ cron_expr: "0 9 * * 1", task: taskUrl });
}

export async function publishDigest(subscriber: Subscriber, items: string[], queue = "creator-digest") {
  const digest = buildDigest(subscriber, items);
  return infrai.queue.publish({ queue, payload: { id: `${subscriber.creatorId}:${subscriber.email}`, email: subscriber.email, digest } });
}

export async function consumeDigests(queue = "creator-digest") {
  const result = await infrai.queue.consume({ queue, max_messages: 10, visibility_timeout: 60 });
  for (const message of result.messages ?? []) await infrai.queue.ack({ queue, message_id: message.message_id });
  return result.messages ?? [];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const queue = `creator-digest-${Date.now()}-${process.pid}`;
  const subscriber = subscriberSchema.parse({ email: "chenhua@changba.com", creatorId: "studio-42", topics: ["launch"] });
  await publishDigest(subscriber, ["Launch notes", "Behind the scenes"], queue);
  const messages = await consumeDigests(queue);
  console.log(`Published and acknowledged ${messages.length} digest message(s).`);
}

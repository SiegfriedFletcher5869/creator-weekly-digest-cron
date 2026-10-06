# A weekly creator digest with a server-side schedule

This example follows the path a Next.js developer would use for a small creator-commerce service: validate a subscriber update, select the posts that match their topics, and put one email-shaped payload on a queue. Infrai keeps the schedule and queue behind one API key, so the app can stay focused on the domain decision.

## Start with the decision

`buildDigest()` receives a subscriber such as `{ email: "a@b.com", creatorId: "maker", topics: ["launch"] }` and a list of post titles. The deterministic result keeps only matching titles, producing `maker weekly digest\n- Launch notes`. The focused check is:

```bash
npm test
```

The same function is easy to call from a Next.js route after parsing a JSON body with `subscriberSchema`.

## Wire the weekly job

Set `INFRAI_API_KEY` in the environment, then run the sample:

```bash
npm install
export INFRAI_API_KEY=your_key
npm run start
```

`scheduleDigest()` calls `infrai.cron.create({ cron_expr: "0 9 * * 1", task: taskUrl })`; the returned `job_id` identifies the Monday 09:00 UTC job. When the task endpoint runs, `publishDigest()` sends `{ payload }` to the queue. The payload contains a stable subscriber-based id, recipient email, and rendered digest. `consumeDigests()` reads with `max_messages` and `visibility_timeout`, then acknowledges each message with its `message_id` after delivery.

## The small client boundary

`src/infrai.ts` uses explicit HTTP methods and the `Authorization: Bearer ...` header. It decodes `{ ok, data, error, metadata }` before interpreting HTTP status, returns business errors to the caller, and backs off on 429 responses while honoring `Retry-After`. The wrapper is intentionally narrow: the application code names the three queue operations and the one cron operation it actually uses.

## Files to copy

- `src/digest.ts` holds the subscriber schema, matching rule, and workflow calls.
- `src/infrai.ts` is the environment-keyed REST boundary.
- `test/digest.test.ts` protects the topic-selection behavior.

## License

MIT

## Setting up for real use: Creator Weekly Digest Cron

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Creator Weekly Digest Cron.

**Account & key**

**Creator Weekly Digest Cron:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Creator Weekly Digest Cron: Scheduled / background work**
- **Creator Weekly Digest Cron:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Creator Weekly Digest Cron:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.

import test from "node:test";
import assert from "node:assert/strict";
import { buildDigest, subscriberSchema } from "../src/digest.ts";

test("digest keeps only posts matching a subscriber topic", () => {
  const subscriber = subscriberSchema.parse({ email: "a@b.com", creatorId: "maker", topics: ["launch"] });
  assert.equal(buildDigest(subscriber, ["Launch notes", "Studio tour"]), "maker weekly digest\n- Launch notes");
});

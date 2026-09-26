import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
  env = await initializeTestEnvironment({
    projectId: "demo-rashi-rules",
    firestore: { rules: readFileSync(resolve(__dirname, "../../../firestore.rules"), "utf8"), host, port: Number(port) },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/alice"), { language: "en" });
    await setDoc(doc(db, "users/alice/private/birth"), { enc: "x" });
    await setDoc(doc(db, "users/alice/chat/m1"), { role: "user" });
    await setDoc(doc(db, "readings/r1"), { uid: "alice", teaser: "t" });
    await setDoc(doc(db, "readings/r1/full/content"), { content: {} });
    await setDoc(doc(db, "entitlements/alice"), { chatCredits: 3 });
    await setDoc(doc(db, "purchases/tok"), { uid: "alice" });
  });
});

afterAll(async () => env?.cleanup());

describe("firestore rules", () => {
  it("owners can read their own safe documents", async () => {
    const db = env.authenticatedContext("alice").firestore();
    for (const path of ["users/alice", "users/alice/chat/m1", "readings/r1", "entitlements/alice"]) {
      await assertSucceeds(getDoc(doc(db, path)));
    }
  });

  it("nobody can read birth data, full readings or purchases from the client", async () => {
    const db = env.authenticatedContext("alice").firestore();
    for (const path of ["users/alice/private/birth", "readings/r1/full/content", "purchases/tok"]) {
      await assertFails(getDoc(doc(db, path)));
    }
  });

  it("other users and signed-out clients can't read", async () => {
    for (const db of [env.authenticatedContext("bob").firestore(), env.unauthenticatedContext().firestore()]) {
      await assertFails(getDoc(doc(db, "users/alice")));
      await assertFails(getDoc(doc(db, "readings/r1")));
      await assertFails(getDoc(doc(db, "entitlements/alice")));
    }
  });

  it("clients can't write anything", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "entitlements/alice"), { chatCredits: 999 }));
    await assertFails(setDoc(doc(db, "users/alice"), { language: "hi" }));
    await assertFails(setDoc(doc(db, "users/alice/chat/m2"), { role: "user" }));
  });
});

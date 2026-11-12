"use client";

import { useEffect } from "react";
import { ACTIVITY_PING_MS, SESSION_IDLE_MS } from "@/lib/auth/session-policy";

/** Dispatched by framed pages (the RAW editor) whose gestures don't reach this window. */
export const ACTIVITY_EVENT = "bentclick:activity";
const GESTURES = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

const toLogin = () => {
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
};

/**
 * The idle half of the session rule (session-policy.ts): a person's gestures renew it, a request alone doesn't. After
 * 2 h without one the page leaves for the login on its own, so client photos don't stay on an unattended screen; the
 * server ends the session too, whatever this page does.
 */
export function SessionActivity() {
  useEffect(() => {
    let lastGesture = Date.now();
    let lastPing = 0;

    async function ping() {
      lastPing = Date.now();
      const res = await fetch("/api/session/activity", { method: "POST" }).catch(() => null);
      if (res?.status === 401) toLogin();
    }

    function onGesture() {
      lastGesture = Date.now();
      if (Date.now() - lastPing >= ACTIVITY_PING_MS) void ping();
    }

    for (const g of GESTURES) window.addEventListener(g, onGesture, { capture: true, passive: true });
    window.addEventListener(ACTIVITY_EVENT, onGesture);
    const idleCheck = window.setInterval(() => {
      if (Date.now() - lastGesture >= SESSION_IDLE_MS) toLogin();
    }, 30_000);
    void ping();

    return () => {
      for (const g of GESTURES) window.removeEventListener(g, onGesture, { capture: true });
      window.removeEventListener(ACTIVITY_EVENT, onGesture);
      window.clearInterval(idleCheck);
    };
  }, []);

  return null;
}

/** For a same-origin frame: its gestures count as activity in this window. Returns the cleanup. */
export function forwardFrameActivity(frame: Window): () => void {
  const notify = () => window.dispatchEvent(new Event(ACTIVITY_EVENT));
  for (const g of GESTURES) frame.addEventListener(g, notify, { capture: true, passive: true });
  return () => {
    for (const g of GESTURES) frame.removeEventListener(g, notify, { capture: true });
  };
}

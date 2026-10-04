"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DemoUser {
  id: string;
  name: string;
  campus: string;
  avatar_emoji: string;
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; users: DemoUser[]; currentUserId: string | null };

/** Demo only: lets one laptop play both sides of a meetup. */
export function DemoSwitcher() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/demo/users")
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) setState({ status: "error", message: data.error ?? "Couldn't load users." });
        else setState({ status: "ready", users: data.users, currentUserId: data.currentUserId });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", message: "Couldn't load users." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function switchTo(userId: string) {
    if (!userId || state.status !== "ready") return;
    setSwitching(true);
    try {
      const res = await fetch("/api/demo/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState({ status: "error", message: data.error ?? "Couldn't switch user." });
        return;
      }
      setState({ ...state, currentUserId: userId });
      router.refresh(); // re-render server components as the new user
    } catch {
      setState({ status: "error", message: "Couldn't switch user." });
    } finally {
      setSwitching(false);
    }
  }

  if (state.status === "loading") {
    return <span className="text-sm text-fog">Loading demo users…</span>;
  }
  if (state.status === "error") {
    return <span className="max-w-64 text-sm font-medium text-coral">{state.message}</span>;
  }
  if (state.users.length === 0) {
    return <span className="text-sm text-fog">No users yet. Run npm run seed.</span>;
  }

  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <span className="hidden sm:inline">Demo: switch user</span>
      <span className="sm:hidden">Demo</span>
      <select
        className="h-9 max-w-44 rounded-lg border-2 border-ink bg-quest px-2 text-sm font-semibold text-ink disabled:opacity-60"
        value={state.currentUserId ?? ""}
        disabled={switching}
        onChange={(e) => switchTo(e.target.value)}
      >
        <option value="" disabled>
          Pick someone
        </option>
        {state.users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.avatar_emoji} {u.name} ({u.campus})
          </option>
        ))}
      </select>
    </label>
  );
}

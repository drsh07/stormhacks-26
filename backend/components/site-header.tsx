import Link from "next/link";
import { DEMO_MODE, getCurrentUser } from "@/lib/auth";
import { DemoSwitcher } from "./demo-switcher";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="border-b-2 border-ink bg-paper">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="font-display text-2xl font-extrabold tracking-tight">
          SideQuest
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm font-medium" data-testid="current-user">
              {user.avatar_emoji} {user.name.split(" ")[0]}
            </span>
          )}
          {DEMO_MODE && <DemoSwitcher />}
        </div>
      </div>
    </header>
  );
}

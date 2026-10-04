import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-14 md:py-20">
      <section>
        <h1 className="text-5xl font-extrabold md:text-7xl">Your gap between classes is a side quest.</h1>
        <p className="mt-5 max-w-[46ch] text-lg text-fog">
          SideQuest reads your SFU schedule, finds people who are free when you are, and hands you both
          something slightly unhinged to do together.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button asChild size="lg">
            <Link href={user ? "/home" : "/onboarding"}>{user ? "Open my week" : "Get started"}</Link>
          </Button>
          {user && (
            <p className="text-sm text-fog">
              Signed in as {user.name}, {user.campus}
            </p>
          )}
        </div>
      </section>

      {/* A real sample quest instead of a stock hero image: this is the product. */}
      <Card className="-rotate-1 bg-quest md:rotate-2" aria-label="Sample quest">
        <CardHeader>
          <p className="text-sm font-semibold">Quest for Maya and Noah, 40 minutes, the AQ</p>
          <CardTitle className="text-3xl">The Concrete Critics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Find the most dramatic slab of concrete in the AQ. Give it a name, a star sign, and a
            one-star review. You both climb, so settle whether it would be a V2 or a V5.
          </p>
          <p className="rounded-lg border-2 border-ink bg-paper p-3 text-sm font-medium">
            Photo proof: both of you pointing at the slab like it owes you money.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

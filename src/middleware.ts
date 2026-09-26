import { type NextRequest, NextResponse } from "next/server";
import { auth } from "./lib/auth";

// Edge routing plus protection (spec 0008): session routing before first
// paint. Guests always reach /chat (tries enforced per action); protected
// pages bounce to the gate with a return path. API, static, verify, and
// reset paths never redirect. A failed session read fails closed for
// protected pages and open for public ones.
export default async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  let userId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    userId = session?.user?.id ?? null;
  } catch {
    userId = null;
  }

  const signinUrl = (next: string) => {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.search = `?next=${encodeURIComponent(next)}`;
    return url;
  };

  if (pathname === "/signin") {
    if (!userId) return NextResponse.next();
    const next = request.nextUrl.searchParams.get("next") ?? "/chat";
    const url = request.nextUrl.clone();
    url.pathname = next.startsWith("/") ? next : "/chat";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/settings" || pathname === "/admin") {
    if (!userId) return NextResponse.redirect(signinUrl(pathname + search));
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/signin", "/settings", "/admin", "/chat"],
};

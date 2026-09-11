import { NextResponse } from "next/server";
    import type { NextRequest } from "next/server";

    export function middleware(request: NextRequest) {
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "";
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(`${base}${pathname}${search}`, { status: 307 });
    }

    export const config = {
    matcher: ["/api/proxy/:path*"],
    };
    
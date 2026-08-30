import { NextRequest,NextResponse } from "next/server";
export function middleware(request:NextRequest){if(request.cookies.get("dormitory_session")?.value!=="1"){const url=new URL("/login",request.url);url.searchParams.set("next",request.nextUrl.pathname);return NextResponse.redirect(url)}return NextResponse.next()}
export const config={matcher:["/dashboard/:path*","/stores/:path*","/rooms/:path*","/residents/:path*","/bills/:path*","/payments/:path*","/users/:path*","/roles/:path*","/settings/:path*"]};

import { getAuth } from "@/lib/auth/server";

type RouteContext = { params: Promise<{ path: string[] }> };

function handler() {
  return getAuth().handler();
}

export async function GET(request: Request, context: RouteContext) {
  return handler().GET(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return handler().POST(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return handler().PUT(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return handler().PATCH(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return handler().DELETE(request, context);
}

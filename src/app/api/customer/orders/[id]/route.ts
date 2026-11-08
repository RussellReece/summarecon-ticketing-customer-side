// src/app/api/customer/orders/[id]/route.ts
// Local Next.js route handler to resolve single customer order without 404
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieHeader = request.headers.get("cookie") || "";

  try {
    const upstreamUrl = process.env.NEXT_PUBLIC_API_URL
      ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "")}/customer/orders`
      : "https://summarecon-admin.axtra.tech/api/customer/orders";

    const res = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json",
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Silakan masuk terlebih dahulu" } },
        { status: res.status }
      );
    }

    const data = await res.json();
    const list = Array.isArray(data?.data)
      ? data.data
      : (data?.data as { items?: Array<{ id?: string | number; order_id?: string; order_code?: string }> })?.items || [];

    const found = list.find(
      (o: { id?: string | number; order_id?: string; order_code?: string }) =>
        String(o.id) === String(id) ||
        String(o.order_id) === String(id) ||
        String(o.order_code) === String(id)
    );

    if (found) {
      return NextResponse.json({ data: found });
    }

    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pesanan tidak ditemukan" } },
      { status: 404 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}


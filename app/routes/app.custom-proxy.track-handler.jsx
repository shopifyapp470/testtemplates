import { data } from "react-router";
import { prisma } from "../db.server.js";
import { authenticate } from "../shopify.server";

/**
 * Shopify App Proxy – Track Employee Referral
 * React Router v7 compatible
 */
export async function action({ request }) {
  // 🔐 Verify Shopify App Proxy signature
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return data(
      { success: false, message: "Unauthorized request" },
      { status: 401 }
    );
  }

  if (request.method !== "POST") {
    return data(
      { success: false, message: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const {
      employeeEmail,
      customerEmail,
      customerId,
      orderId,
      orderNumber,
      totalAmount,
      shop,
    } = await request.json();

    // ✅ Required fields validation
    if (!employeeEmail || !orderId) {
      return data(
        { success: false, message: "Missing required tracking data" },
        { status: 400 }
      );
    }

    // 🔁 Prevent duplicate order tracking
    const existing = await prisma.employeeReferral.findUnique({
      where: { orderId: String(orderId) },
      select: { id: true },
    });

    if (existing) {
      return data({
        success: true,
        duplicate: true,
        message: "Order already tracked",
      });
    }

    // 💾 Save referral entry
    const record = await prisma.employeeReferral.create({
      data: {
        employeeEmail,
        customerEmail: customerEmail ?? null,
        customerId: customerId ? String(customerId) : null,
        orderId: String(orderId),
        orderNumber: orderNumber ? String(orderNumber) : null,
        totalAmount: Number(totalAmount) || 0,
        shop: session.shop || shop,
      },
    });

    return data(
      {
        success: true,
        id: record.id,
        message: "Referral tracked successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Referral Track Error:", error);

    // Prisma unique constraint safeguard
    if (error?.code === "P2002") {
      return data(
        { success: false, message: "Order already exists" },
        { status: 409 }
      );
    }

    return data(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Optional health check
 */
export async function loader({ request }) {
  await authenticate.public.appProxy(request);
  return data({ status: "Referral proxy active" });
}

import { data } from "react-router";
import { prisma } from "../db.server.js";

export async function action({ request }) {
  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
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

    if (!employeeEmail || !orderId) {
      return data(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // 🔒 Prevent duplicate order entry
    const existing = await prisma.employeeReferral.findUnique({
      where: { orderId },
    });

    if (existing) {
      return data({ success: true, message: "Order already tracked" });
    }

    await prisma.employeeReferral.create({
      data: {
        employeeEmail,
        customerEmail: customerEmail ?? null,
        customerId: customerId ?? null,
        orderId,
        orderNumber,
        totalAmount: Number(totalAmount),
        shop,
      },
    });

    return data({ success: true });
  } catch (error) {
    console.error("Referral Save Error:", error);
    return data(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

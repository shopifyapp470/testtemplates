import { data } from "react-router";
import  db  from "../db.server.js";
import { authenticate } from "../shopify.server.js";
 
export async function action({ request }) {
  // 1. Security check: Shopify Proxy Signature Validation
  // Ye session tabhi milega jab request valid Shopify signature ke sath aayegi
  const { session } = await authenticate.public.appProxy(request);
 
  if (!session) {
    return data({ success: false, message: "Unauthorized: Invalid Signature" }, { status: 401 });
  }
 
  if (request.method !== "POST") {
    return data({ success: false, message: "Method not allowed" }, { status: 405 });
  }
 
  try {
    const payload = await request.json();
    const {
      employeeEmail,
      customerEmail,
      customerId,
      orderId,
      orderNumber,
      totalAmount,
    } = payload;
 
    // 2. Validation
    if (!employeeEmail || !orderId) {
      return data({ success: false, message: "Missing data" }, { status: 400 });
    }
 
    // 3. Duplicate Check
    const existing = await db.employeeReferral.findUnique({
      where: { orderId: String(orderId) },
    });
 
    if (existing) {
      return data({ success: true, message: "Duplicate suppressed" });
    }
 
    // 4. Save using Session Shop (More secure than payload shop)
    await db.employeeReferral.create({
      data: {
        employeeEmail,
        customerEmail: customerEmail || null,
        customerId: customerId ? String(customerId) : null,
        orderId: String(orderId),
        orderNumber: String(orderNumber || ""),
        totalAmount: parseFloat(totalAmount) || 0,
        shop: session.shop, 
        dateAdded: new Date(),
      },
    });
 
    return data({ success: true }, { status: 201 });
 
  } catch (error) {
    console.error("Referral Error:", error);
    return data({ success: false, message: "Internal Error" }, { status: 500 });
  }
}
 
export async function loader({ request }) {
  await authenticate.public.appProxy(request);
  return data({ status: "Referral Handler Active" });
}
 
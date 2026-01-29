import { data } from "react-router";
import db from "../db.server"; // Default import (no curly braces)
import { authenticate } from "../shopify.server";
 
export const loader = async ({ request }) => {
  // Security: Check if request is coming through Shopify Proxy
  await authenticate.public.appProxy(request);
  return data({ message: "Referral Proxy Active" });
};
 
export const action = async ({ request }) => {
  // 1. Authenticate Proxy Signature
  const { session } = await authenticate.public.appProxy(request);
 
  if (!session) {
    return data({ success: false, message: "Unauthorized Request" }, { status: 401 });
  }
 
  try {
    const payload = await request.json();
    const {
      employeeEmail,
      customerEmail,
      orderId,
      orderNumber,
      totalAmount,
    } = payload;
 
    if (!employeeEmail || !orderId) {
      return data({ success: false, message: "Missing data" }, { status: 400 });
    }
 
    // 2. Duplicate Check
    const existingEntry = await db.employeeReferral.findUnique({
      where: { orderId: String(orderId) },
      select: { id: true }
    });
 
    if (existingEntry) {
      return data({ success: true, message: "Already tracked", duplicate: true });
    }
 
    // 3. Save to Database
    await db.employeeReferral.create({
      data: {
        employeeEmail,
        customerEmail: customerEmail || null,
        orderId: String(orderId),
        orderNumber: String(orderNumber || ""),
        totalAmount: parseFloat(totalAmount) || 0,
        shop: session.shop, // Authenticated shop from session
        dateAdded: new Date(),
      },
    });
 
    return data({ success: true }, {
      status: 201,
      headers: {
        "Access-Control-Allow-Origin": "*", // Browser CORS policy safety
        "Content-Type": "application/json"
      }
    });
 
  } catch (error) {
    console.error("Proxy Error:", error);
    return data({ success: false, message: "Internal server error" }, { status: 500 });
  }
};
 
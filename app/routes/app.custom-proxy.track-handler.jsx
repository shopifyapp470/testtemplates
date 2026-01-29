import { data } from "react-router";
import { db } from "../db.server.js";
import { authenticate } from "../shopify.server";
 
export async function action({ request }) {
  // 1. Security check: Shopify Signature Validation
  // Ye line ensure karti hai ki request sirf Shopify store se aa rahi hai
  const { session } = await authenticate.public.appProxy(request);
 
  if (!session) {
    return data({ success: false, message: "Unauthorized Request" }, { status: 401 });
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
      shop,
    } = payload;
 
    // 2. Mandatory Validation
    if (!employeeEmail || !orderId) {
      return data(
        { success: false, message: "Missing required tracking data" },
        { status: 400 }
      );
    }
 
    // 3. Duplicate Prevention (Unique Order check)
    const existingEntry = await db.employeeReferral.findUnique({
      where: { orderId: String(orderId) },
      select: { id: true }
    });
 
    if (existingEntry) {
      return data({ 
        success: true, 
        message: "Order tracking already recorded", 
        duplicate: true 
      });
    }
 
    // 4. Save to Database
    const record = await db.employeeReferral.create({
      data: {
        employeeEmail,
        customerEmail: customerEmail || null,
        customerId: customerId ? String(customerId) : null,
        orderId: String(orderId),
        orderNumber: String(orderNumber),
        totalAmount: parseFloat(totalAmount) || 0,
        shop: session.shop || shop, // Use authenticated shop from session
        dateAdded: new Date(),
      },
    });
 
    return data({ 
      success: true, 
      id: record.id,
      message: "Referral tracked successfully" 
    }, { status: 201 });
 
  } catch (error) {
    console.error("Proxy Track Error:", error);
 
    if (error.code === 'P2002') {
      return data({ success: false, message: "Order ID already exists" }, { status: 409 });
    }
 
    return data(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
 
export async function loader({ request }) {
  await authenticate.public.appProxy(request);
  return data({ message: "Proxy endpoint active" });
}
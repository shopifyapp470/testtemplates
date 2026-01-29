import { data } from "react-router";
import { db } from "../db.server.js";
import { authenticate } from "../shopify.server";
 
export async function action({ request }) {
  // Shopify App Proxy requests automatically check for signature 
  // Agar aap authenticate.public.appProxy(request) use karte hain
  
  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }
 
  try {
    const payload = await request.json();
    const {
      employeeEmail,
      customerEmail,
      orderId,
      orderNumber,
      totalAmount,
      shop,
    } = payload;
 
    // Validation
    if (!employeeEmail || !orderId) {
      return data({ success: false, message: "Missing tracking data" }, { status: 400 });
    }
 
    // 🔒 Duplicate Entry Check
    const existing = await db.employeeReferral.findUnique({
      where: { orderId: String(orderId) },
    });
 
    if (existing) {
      return data({ success: true, message: "Already tracked" });
    }
 
    // 💾 Database Save
    await db.employeeReferral.create({
      data: {
        employeeEmail,
        customerEmail: customerEmail || null,
        orderId: String(orderId),
        orderNumber: String(orderNumber || ""),
        totalAmount: parseFloat(totalAmount || 0),
        shop: shop,
        dateAdded: new Date(),
      },
    });
 
    // Proxy response headers ke saath (Liquid context bypass karne ke liye application/json zaroori hai)
    return data({ success: true }, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Pixel environment ke liye zaroori
      }
    });
 
  } catch (error) {
    console.error("Referral Save Error:", error);
    return data({ success: false, message: "Server error" }, { status: 500 });
  }
}
 
// Loader to prevent 404
export async function loader() {
  return data({ status: "Referral Proxy Active" });
}
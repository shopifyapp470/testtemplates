import { data } from "react-router";
import db from "../db.server"; // Default import fix
 
export const action = async ({ request }) => {
  // CORS Preflight handling
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
 
  console.log("🚀 [BACKEND] Request received at track-handler");
 
  try {
    const payload = await request.json();
    console.log("📦 [BACKEND] Received Payload:", JSON.stringify(payload, null, 2));
 
    const { employeeEmail, orderId, shop } = payload;
 
    // Validation Log
    if (!employeeEmail || !orderId) {
      console.error("❌ [BACKEND] Validation Failed: Missing Email or OrderId");
      return data({ success: false, error: "Missing fields" }, { 
        status: 400, 
        headers: { "Access-Control-Allow-Origin": "*" } 
      });
    }
 
    // Database Check Log
    const existing = await db.employeeReferral.findUnique({
      where: { orderId: String(orderId) },
    });
 
    if (existing) {
      console.warn(`⚠️ [BACKEND] Order ${orderId} already exists in DB.`);
      return data({ success: true, message: "Duplicate" }, { 
        headers: { "Access-Control-Allow-Origin": "*" } 
      });
    }
 
    // Insertion Log
    const newRecord = await db.employeeReferral.create({
      data: {
        employeeEmail,
        customerEmail: payload.customerEmail || null,
        orderId: String(orderId),
        orderNumber: String(payload.orderNumber || ""),
        totalAmount: parseFloat(payload.totalAmount) || 0,
        shop: shop,
        dateAdded: new Date(),
      },
    });
 
    console.log("✅ [BACKEND] Success! Data inserted with ID:", newRecord.id);
 
    return data({ success: true, id: newRecord.id }, { 
      status: 201,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      }
    });
 
  } catch (error) {
    console.error("🔥 [BACKEND] Database Error:", error.message);
    return data({ error: error.message }, { 
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" } 
    });
  }
};
 
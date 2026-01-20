import { authenticate, unauthenticated } from "../shopify.server";
import { data, redirect } from "react-router"; // ✅ React Router imports
import db from "../db.server";
 
// =========================================================
// 1. LOADER: Referral Tracking aur Data Fetching
// =========================================================
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const referrerId = url.searchParams.get("ref");
 
  // --- A. REFERRAL TRACKING LOGIC ---
  if (referrerId && shop) {
    //const userIp = request.headers.get("x-forwarded-for") || "unknown";
 
    try {
      // Database mein tracking entry (Bridge) create karein
      await db.referralTracking.create({
        data: {
          referrerId: String(referrerId),
          shop: shop,
          createdAt: new Date()
        }
      });
      console.log(`✅ [REFERRAL] Captured: Referrer=${referrerId}`);
      
      // User ko store ke home page par bhej dein
      return redirect(`https://${shop}`);
    } catch (e) {
      console.error("❌ [REFERRAL] Error:", e);
    }
  }
 
  // --- B. POINTS FETCHING LOGIC ---
  const { session } = await authenticate.public.appProxy(request);
 
  if (!session) {
    return data({ success: false, message: "No session found" });
  }
 
  const verifiedCustomerId = url.searchParams.get("logged_in_customer_id");
 
  if (!verifiedCustomerId) {
    return data({ success: false, message: "Customer not logged in" });
  }
 
  try {
    const rewardRecord = await db.rewardpoint.findFirst({
      where: {
        customerid: String(verifiedCustomerId),
        store: session.shop,
      },
    });
 
    return data({ 
      success: true, 
      pointvalue: rewardRecord ? rewardRecord.pointvalue : 0,
      totalPoints: rewardRecord ? rewardRecord.activepoint : 0,
      birthdayPoint: rewardRecord ? rewardRecord.birthdayPoint : 0,
      anniversaryPoint: rewardRecord ? rewardRecord.anniversaryPoint : 0,
    });
 
  } catch (error) {
    console.error("❌ [LOADER] Error:", error);
    return data({ success: false, message: "Server Error" }, { status: 500 });
  }
};
 
// =========================================================
// 2. ACTION: Discount Code Generation
// =========================================================
export const action = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  
  if (!session) return data({ error: "Unauthorized" }, { status: 401 });
 
  const url = new URL(request.url);
  const verifiedCustomerId = url.searchParams.get("logged_in_customer_id");
 
  if (!verifiedCustomerId) {
    return data({ error: "Session expired" }, { status: 403 });
  }
 
  try {
    const { userValue } = await request.json();
    const shop = session.shop;
 
    // 1. Points Validation
    const rewardRecord = await db.rewardpoint.findFirst({
      where: { customerid: String(verifiedCustomerId), store: shop }
    });
 
    if (!rewardRecord || rewardRecord.pointvalue < parseFloat(userValue)) {
      return data({ message: "Insufficient points" }, { status: 400 });
    }
 
    // 2. Create Discount via GraphQL
    const formattedAmount = parseFloat(userValue).toFixed(2);
    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
    const discountTitle = `REWARD-${verifiedCustomerId}-${uniqueSuffix}`;
 
    const { admin } = await unauthenticated.admin(shop);
    
    const response = await admin.graphql(
      `#graphql
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode { codeDiscount { ... on DiscountCodeBasic { title } } }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          basicCodeDiscount: {
            title: discountTitle,
            code: discountTitle,
            startsAt: new Date().toISOString(),
            customerSelection: { 
                customers: { add: [`gid://shopify/Customer/${verifiedCustomerId}`] } 
            },
            customerGets: {
              value: { discountAmount: { amount: formattedAmount, appliesOnEachItem: false } },
              items: { all: true }
            },
            appliesOncePerCustomer: true,
            usageLimit: 1
          }
        }
      }
    );
 
    const responseJson = await response.json();
    const errors = responseJson.data?.discountCodeBasicCreate?.userErrors;
 
    if (errors && errors.length > 0) {
        return data({ success: false, message: errors[0].message }, { status: 400 });
    }
 
    return data({ 
        success: true, 
        discountTitle: discountTitle 
    });
 
  } catch (error) {
    console.error("❌ [ACTION] Error:", error);
    return data({ error: "Server Error" }, { status: 500 });
  }
};
 
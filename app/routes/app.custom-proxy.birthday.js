
import { authenticate } from "../shopify.server";
import { data } from "react-router"; 
import db from "../db.server";

// =========================================================
// 1. LOADER (GET Request)
//    URL: /apps/public/custom-proxy/birthday?logged_in_customer_id=...
// =========================================================
export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return data({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id") || url.searchParams.get("customerId");
  const shop = session.shop;

  if (!customerId) {
    return data({ success: false, message: "Customer ID missing" }, { status: 400 });
  }
  try {
    // 1. Customer Data (Rewardpoint Table)
    // Points, History, Last Reward Year
    const customerRewardData = await db.rewardpoint.findFirst({
      where: {
        customerid: String(customerId),
        store: shop,
      },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    // 2. Shop Settings (userbirthday Table)
    // Birthday/Anniversary Point Values (e.g. 100, 150)
    const shopSettings = await db.userbirthday.findUnique({
      where: {
        shop: shop,
      },
    });
    // 3. Prepare JSON Response
    const responsePayload = {
      success: true,
      // Basic Data
      totalPoints: customerRewardData ? customerRewardData.activepoint : 0,
      orders: customerRewardData ? customerRewardData.orders : [],
      // Settings (From userbirthday)
      birthdayPoint: shopSettings ? shopSettings.birthdayPoint : 0,
      anniversaryPoint: shopSettings ? shopSettings.anniversaryPoint : 0,
      // Status (From Rewardpoint - User get reward or not)
      lastBirthdayRewardYear: customerRewardData ? customerRewardData.lastBirthdayRewardYear : null,
      lastAnniversaryRewardYear: customerRewardData ? customerRewardData.lastAnniversaryRewardYear : null
    };
    return data(responsePayload, { status: 200 });
  } catch (error) {
    console.error("Birthday Proxy Error:", error);
    return data({ success: false, message: "Server Error" }, { status: 500 });
  }
};

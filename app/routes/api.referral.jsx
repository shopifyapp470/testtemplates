import { redirect } from "react-router"; // React Router 7 import
import db from "../db.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const hexRef = url.searchParams.get("ref");
  const encodedEmail = url.searchParams.get("se");
  const shop = url.searchParams.get("shop");
  
  // Render (Proxy) headers se user ki IP nikalna
  // React Router 7 mein request.headers ka access pehle jaisa hi hai
  const userIp = request.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";

  if (hexRef && shop) {
    try {
      // Decode base64 strings
      const referrerId = Buffer.from(hexRef, 'base64').toString('utf-8');
      const senderEmail = encodedEmail ? Buffer.from(encodedEmail, 'base64').toString('utf-8') : null;

      // 1. ReferralTracking table mein entry karein
      // Aapke model ke fields: referrerId, senderEmail, userIp, shop
      await db.referralTracking.create({
        data: {
          referrerId: referrerId,
          senderEmail: senderEmail,
          userIp: userIp,
          shop: shop,
          receiverEmail: null // Initialization ke waqt null rakhein
        }
      });

      console.log(`✅ [TRACKED] Sender: ${senderEmail} | Shop: ${shop} | IP: ${userIp}`);

      // 2. User ko Shopify Store par redirect karein
      // React Router 7 ka redirect function automatic response return karta hai
      return redirect(`https://${shop}`);
      
    } catch (error) {
      console.error("❌ [REFERRAL ERROR]:", error);
      // Error hone par shop home ya base URL par safe redirect
      return redirect(shop ? `https://${shop}` : "/");
    }
  }

  // Agar parameters nahi hain toh home page par redirect
  return redirect("/");
};
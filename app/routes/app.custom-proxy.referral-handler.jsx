import { redirect } from "react-router";
import db from "../db.server";
 
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  
  // Params Fetch
  const hexRef = url.searchParams.get("ref"); // Referrer ID (Encoded)
  const encodedEmail = url.searchParams.get("se"); // Sender Email (Encoded)
  const shop = url.searchParams.get("shop");
  
  // User IP (Matching ke liye)
  const userIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
 
  if (hexRef && shop) {
    try {
      // 1. Decode Data
      const referrerId = Buffer.from(hexRef, 'base64').toString('utf-8');
      const senderEmail = encodedEmail ? Buffer.from(encodedEmail, 'base64').toString('utf-8') : null;
 
      console.log(`🔗 Referral Clicked | Sender: ${senderEmail} | IP: ${userIp}`);
 
      // 2. DB mein Entry Save karo (Sender Email ke sath)
      // Receiver Email abhi 'null' rahega
      await db.referralTracking.create({
        data: {
          referrerId: referrerId,
          senderEmail: senderEmail, // <--- SENDER MAIL SAVED HERE
          userIp: userIp,
          shop: shop,
          isUsed: false,      // Abhi use nahi hua
          receiverEmail: null // Signup ke baad update hoga
        }
      });
 
      // 3. 404 Fix: User ko seedha Register page par bhejo
      return redirect(`https://${shop}/account/register`);
 
    } catch (error) {
      console.error("Referral Proxy Error:", error);
      // Error aaye toh Home page par bhej do
      return redirect(`https://${shop}`);
    }
  }
 
  return redirect("/");
};
 
export default function ReferralHandler() { return null; }
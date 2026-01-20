import { authenticate } from "../shopify.server";
import db from "../db.server";
 
export const action = async ({ request }) => {
  // 1. Webhook ko authenticate karein
  const { admin, topic, shop, payload } = await authenticate.webhook(request);
 
  console.log(`\n🔔 CUSTOMER WEBHOOK RECEIVED | TOPIC: ${topic}`);
 
  if (topic === "CUSTOMERS_CREATE" || topic === "CUSTOMERS_UPDATE") {
    const customerId = String(payload.id);
    const customerEmail = payload.email;
    console.log(`👤 [SYNC START] ID: ${customerId}`);
 
    try {
      // 2. GraphQL se Birthday aur Anniversary fetch karein
      const response = await admin.graphql(
        `#graphql
        query getCustomerMetafields($id: ID!) {
          customer(id: $id) {
            birthday: metafield(namespace: "custom", key: "birthday") { value }
            anniversary: metafield(namespace: "custom", key: "anniversary") { value }
          }
        }`,
        { variables: { id: `gid://shopify/Customer/${customerId}` } }
      );
 
      const data = await response.json();
      const birthdayValue = data.data?.customer?.birthday?.value;
      const anniversaryValue = data.data?.customer?.anniversary?.value;
 
      // 3. Database mein check karein ki customer pehle se hai ya nahi
      const existingUser = await db.rewardpoint.findFirst({
        where: { customerid: customerId }
      });
 
      // 4. Update Data Object tayyar karein (Dates handle karne ke liye)
      const updateData = {};
      if (birthdayValue) updateData.dob = new Date(birthdayValue);
      if (anniversaryValue) updateData.anniversaryDate = new Date(anniversaryValue);
      if (customerEmail) updateData.customeremail = customerEmail;
 
      if (existingUser) {
        // CASE: CUSTOMER PEHLE SE HAI (Sirf Dates Update karein)
        if (birthdayValue || anniversaryValue) {
          console.log(`📅 [UPDATE] Found Data -> BDay: ${birthdayValue}, Anniversary: ${anniversaryValue}`);
          await db.rewardpoint.update({
            where: { id: existingUser.id },
            data: updateData
          });
          console.log("✅ [DB UPDATE] Customer dates updated successfully.");
        } else {
          console.log("ℹ️ [SKIP] No new dates to update for existing user.");
        }
      } else {
        // CASE: NAYA CUSTOMER HAI (Referral Validate karein aur Create karein)
        console.log("🆕 [DB CREATE] New customer detected. Validating Referral...");
 
        let verifiedReferrerId = null;
 
        // A. ReferralTracking se latest click uthayein (Last 30 mins)
        const bufferTime = new Date(Date.now() - 30 * 60000); 
        const lastClick = await db.referralTracking.findFirst({
          where: { 
            shop: shop, 
            createdAt: { gte: bufferTime } 
          },
          orderBy: { createdAt: 'desc' }
        });
 
        if (lastClick) {
          const potentialId = String(lastClick.referrerId);
 
          // B. CHECK: Kya ye Referrer hamare Rewardpoint table mein exist karta hai?
          const validReferrer = await db.rewardpoint.findFirst({
            where: { 
              customerid: potentialId,
              store: shop 
            }
          });
 
          if (validReferrer) {
            verifiedReferrerId = potentialId;
            console.log(`🎯 [MATCH SUCCESS] Referrer Verified: ${verifiedReferrerId}`);
          } else {
            console.log(`⚠️ [MATCH FAILED] ID ${potentialId} is not a registered customer in our table.`);
          }
 
          // C. Cleanup: Use kiya hua click delete karein
          await db.referralTracking.delete({ where: { id: lastClick.id } });
        }
 
        // D. Rewardpoint Table mein entry Create karein (With Referral & Dates)
        await db.rewardpoint.create({
          data: {
            customerid: customerId,
            customeremail: customerEmail,
            store: shop,
            pointvalue: 0,
            activepoint: 0,
            pendingpoint: 0,
            referredBy: verifiedReferrerId, // Validation pass hui to ID, warna null
            dob: birthdayValue ? new Date(birthdayValue) : null,
            anniversaryDate: anniversaryValue ? new Date(anniversaryValue) : null,
            firstOrderDone: false
          }
        });
        console.log(`✅ [SUCCESS] User created. referredBy: ${verifiedReferrerId}`);
      }
 
    } catch (error) {
      console.error("❌ [ERROR] Webhook processing failed:", error);
    }
  }
 
  return new Response("Webhook Received", { status: 200 });
};
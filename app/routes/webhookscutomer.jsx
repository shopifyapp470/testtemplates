import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { admin, topic, shop, payload } = await authenticate.webhook(request);

  console.log(`\n🔔 CUSTOMER WEBHOOK RECEIVED | TOPIC: ${topic}`);

  if (topic === "CUSTOMERS_CREATE" || topic === "CUSTOMERS_UPDATE") {
    const customerId = String(payload.id);
    const customerEmail = payload.email;
    console.log(`👤 [SYNC START] ID: ${customerId}`);

    try {
      // 1. GraphQL se Birthday AND Anniversary fetch karein
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

      // Update Data Object tayyar karo
      const updateData = {};
      if (birthdayValue) updateData.dob = new Date(birthdayValue);
      if (anniversaryValue) updateData.anniversaryDate = new Date(anniversaryValue);
      if (customerEmail) updateData.customeremail = customerEmail;

      // 2. Database Check (Pehle se user hai ya nahi)
      const existingUser = await db.rewardpoint.findFirst({
        where: { customerid: customerId }
      });

      if (existingUser) {
        // =======================================================
        // UPDATE Existing User (Sirf Dates aur Email)
        // =======================================================
        if (birthdayValue || anniversaryValue) {
          console.log(`📅 Found Data -> BDay: ${birthdayValue}, Anniversary: ${anniversaryValue}`);
          await db.rewardpoint.update({
            where: { id: existingUser.id },
            data: updateData
          });
          console.log("✅ [DB UPDATE] Customer dates updated.");
        } else {
          console.log("⚠️ No Birthday or Anniversary Metafield found for update.");
        }
      } else {
        // =======================================================
        // CREATE New User (Referral Logic Ke Saath)
        // =======================================================
        console.log("🆕 [DB CREATE] Creating new user record.");
        console.log("🔗 Checking for referral tracking...");

        // Referral match karein (Latest click jisme receiverEmail null ho)
        const lastClick = await db.referralTracking.findFirst({
          where: { shop: shop, receiverEmail: null },
          orderBy: { createdAt: 'desc' }
        });

        let finalReferrer = null;

        if (lastClick) {
          finalReferrer = lastClick.referrerId;
          console.log(`✅ Referral Found! Sender: ${lastClick.senderEmail} -> Receiver: ${customerEmail}`);

          // Tracking table mein receiver ka email fill karein (Null issue fix)
          await db.referralTracking.update({
            where: { id: lastClick.id },
            data: { receiverEmail: customerEmail }
          });
        } else {
          console.log("⚠️ No referral click found for this new user.");
        }

        // Database mein entry create karein
        await db.rewardpoint.create({
          data: {
            customerid: customerId,
            customeremail: customerEmail,
            store: shop,
            pointvalue: 0,
            activepoint: 0,
            pendingpoint: 0,
            referredBy: finalReferrer, // Referral ID yahan save hogi
            firstOrderDone: false,
            dob: birthdayValue ? new Date(birthdayValue) : null,
            anniversaryDate: anniversaryValue ? new Date(anniversaryValue) : null
          }
        });
        console.log(`✅ [DB CREATE] Success! referredBy: ${finalReferrer}`);
      }
    } catch (error) {
      console.error("❌ [ERROR] Failed to sync customer dates or referral", error);
    }
  }

  return new Response();
};
import { authenticate } from "../shopify.server";
import db from "../db.server";
 
export const action = async ({ request }) => {
  const { admin, topic, shop, payload } = await authenticate.webhook(request);
 
  console.log(`\n🔔 CUSTOMER WEBHOOK RECEIVED | TOPIC: ${topic}`);
  // =======================================================
  // CUSTOMER LOGIC (Birthday & Anniversary Sync)
  // =======================================================
  if (topic === "CUSTOMERS_CREATE" || topic === "CUSTOMERS_UPDATE") {
     
      const customerId = String(payload.id);
      const customerEmail = payload.email;
      console.log(`👤 [SYNC START] ID: ${customerId}`);
 
      try {
        // 1. GraphQL se Birthday AND Anniversary dono fetch karein
        // Hum "Alias" use kar rahe hain (birthday: metafield...) taki data easily mile
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
        // Values nikalo (Format: "YYYY-MM-DD")
        const birthdayValue = data.data?.customer?.birthday?.value;
        const anniversaryValue = data.data?.customer?.anniversary?.value;
        // Agar dono me se koi bhi value hai, tabhi DB update karenge
        if (birthdayValue || anniversaryValue) {
            console.log(`📅 Found Data -> BDay: ${birthdayValue}, Anniversary: ${anniversaryValue}`);
            // Update Data Object tayyar karo
            const updateData = {};
            if (birthdayValue) updateData.dob = new Date(birthdayValue);
            if (anniversaryValue) updateData.anniversaryDate = new Date(anniversaryValue);
            // Email bhi update kar dete hain agar available ho
            if (customerEmail) updateData.customeremail = customerEmail;
            // 2. Database Check
            const existingUser = await db.rewardpoint.findFirst({
                where: { customerid: customerId }
            });
            if (existingUser) {
                // UPDATE Existing User
                await db.rewardpoint.update({
                    where: { id: existingUser.id },
                    data: updateData
                });
                console.log("✅ [DB UPDATE] Customer dates updated.");
            } else {
                // CREATE New User
                console.log("🆕 [DB CREATE] Creating new user record.");
                // Create ke liye hume saare required fields dene honge
                await db.rewardpoint.create({
                    data: {
                        customerid: customerId,
                        customeremail: customerEmail,
                        store: shop,
                        pointvalue: 0,
                        activepoint: 0,
                        pendingpoint: 0,
                        // Agar value hai to Date object, nahi to null
                        dob: birthdayValue ? new Date(birthdayValue) : null,
                        anniversaryDate: anniversaryValue ? new Date(anniversaryValue) : null
                    }
                });
            }
        } else {
            console.log("⚠️ No Birthday or Anniversary Metafield found.");
        }
      } catch (error) {
          console.error("❌ [ERROR] Failed to sync customer dates", error);
      }
  }
  return new Response();
};
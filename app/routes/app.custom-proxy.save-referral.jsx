import { data } from "react-router"; 
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  // 1. Authenticate Proxy Request
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Data Parse karein
    const body = await request.json();
    const { referrerId, customerId, shop } = body;

    console.log(`🔗 Referral Request: User ${customerId} referred by ${referrerId}`);

    // Self-referral rokne ke liye
    if (referrerId === customerId) {
      return json({ success: false, message: "Cannot refer yourself" });
    }

    // 3. Check karein ki User B (New User) exist karta hai ya nahi
    const currentUser = await db.rewardpoint.findFirst({
      where: { customerid: customerId }
    });

    // Agar User B abhi tak DB mein nahi hai, to create karein
    // (Webhook se data aane me delay ho sakta hai, isliye yahan safety ke liye create/update karte hain)
    let userB;
    if (!currentUser) {
        userB = await db.rewardpoint.create({
            data: {
                customerid: customerId,
                customeremail: "", // Email abhi available nahi hai to blank
                store: shop,
                pointvalue: 0,
                // Referrer ID yahan save karein
                referredBy: referrerId 
            }
        });
    } else {
        // Agar User B pehle se hai, check karein ki wo pehle hi refer to nahi ho chuka?
        // Aur check karein ki usne koi order to place nahi kiya (Existing customer shouldn't be referred)
        if (currentUser.referredBy) {
            return json({ success: false, message: "User already referred" });
        }
        if (currentUser.firstOrderDone) {
            return json({ success: false, message: "User is an existing customer" });
        }

        // Update Record
        userB = await db.rewardpoint.update({
            where: { id: currentUser.id },
            data: { referredBy: referrerId }
        });
    }

    return data({ success: true, message: "Referral saved successfully" });

  } catch (error) {
    console.error("Referral Error:", error);
    return json({ success: false, message: "Server error" }, { status: 500 });
  }
};
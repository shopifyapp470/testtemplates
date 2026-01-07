import db from "../db.server";
import CleverTap from "clevertap";

// ==========================================
// 🔧 CONFIGURATION & INITIALIZATION
// ==========================================
// ==========================================
// 🔧 DYNAMIC CONFIGURATION HELPER
// ==========================================
// Ye function database se shop-wise credentials nikalega
const getCTConfig = async (shop) => {
    const config = await db.cleverTapConfig.findUnique({
        where: { shop: shop }
    });

    if (!config) {
        throw new Error(`CleverTap configuration not found for shop: ${shop}`);
    }

    return {
        accountId: config.accountId,
        passcode: config.passcode,
        walletId: config.walletId,
        region: config.region || "in1"
    };
};

const sanitize = (str) => {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, " ");
};

// ==========================================
// 1. GENERIC EVENT FUNCTION (SDK Version)
// ==========================================
export const sendCleverTapEvent = async (identity, eventName, eventData, shop) => {
    try {
        const config = await getCTConfig(shop);
        // Har baar naya instance initialize karna padega kyunki accountId alag ho sakti hai
        const clevertap = CleverTap.init(config.accountId, config.passcode, config.region);

        const eventPayload = [{
            identity: String(identity),
            type: "event",
            evtName: eventName,
            evtData: eventData
        }];

        const result = await clevertap.upload(eventPayload);
        console.log(`📊 [CT EVENT] Sent: ${eventName}`, result);
    } catch (e) { 
        console.error(`❌ [CT EVENT ERROR]`, e.message); 
    }
};

// ==========================================
// 2. WALLET API (SDK uses manual fetch as it's a specialized endpoint)
// ==========================================
// Note: The Node SDK primarily handles Profiles and Events. 
// For Promo/Wallet APIs, we continue using the Fetch/Axios method 
// as they are custom endpoints not bundled in the standard 'upload' method.
export const updateCleverTapWallet = async (identity, points, type, orderId, saleAmount, description, shop, bucketType = "ACTIVE") => {
    if (!points || points <= 0) return;

    try {
        const config = await getCTConfig(shop);
        
        // Dynamic URL based on Region and Wallet ID from DB
        const url = `https://${config.region}.api.clevertap.com/1/promo/creditDebit?identity=${encodeURIComponent(identity)}&walletId=${config.walletId}`;
        
        const body = {
            "description": sanitize(description),
            "points": Number(points),
            "transactionType": type,
            "orderId": sanitize(orderId),
            "saleAmount": Number(saleAmount),
            "bucketType": bucketType,
            "metadata": { "Shop": sanitize(shop) }
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "X-CleverTap-Account-Id": config.accountId, 
                "X-CleverTap-Passcode": config.passcode 
            },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        console.log(`💰 [CT WALLET] ${type} Result:`, result.status);
    } catch (e) { 
        console.error(`❌ [CT NETWORK ERROR]`, e.message); 
    }
};

// ==========================================
// 3. USER PROFILE UPDATE (New SDK Helper)
// ==========================================
export const updateCleverTapProfile = async (identity, profileData, shop) => {
  try {
        const config = await getCTConfig(shop);
        const clevertap = CleverTap.init(config.accountId, config.passcode, config.region);

        const profilePayload = [{
            identity: String(identity),
            type: "profile",
            profileData: profileData
        }];

        await clevertap.upload(profilePayload);
        console.log(`👤 [CT PROFILE] Updated for: ${identity}`);
    } catch (e) {
        console.error(`❌ [CT PROFILE ERROR]`, e.message);
    }
};

// ==========================================
// 4. PENDING TO ACTIVE LOGIC (2 Min Delay)
// ==========================================
export const processPendingToActive = (identity, points, orderId, saleAmount, shop, rewardDbId) => {
    
    console.log(`⏳ [TIMER STARTED] Queued ${points} pts for 2 mins (Order #${orderId})`);

    setTimeout(async () => {
        console.log(`⏰ [TIMER DONE] Moving points to ACTIVE for Order #${orderId}`);

        try {
            // ✅ STEP A: Database Update
            await db.rewardpoint.update({
                where: { id: rewardDbId },
                data: {
                    pendingpoint: { decrement: points }, 
                    activepoint: { increment: points }, 
                    pointvalue: { increment: points } 
                }
            });
            console.log("✅ [DB UPDATE] Points moved: Pending -> Active & Total updated.");

            // ✅ STEP B: CleverTap Wallet Credit Call
           await updateCleverTapWallet(
                identity, points, "CREDIT", orderId, saleAmount, 
                `First Order Reward - Order #${orderId}`, 
                shop, // <--- MUST PASS SHOP
                "ACTIVE"
            );

            // ✅ STEP C: CleverTap Profile Update (Update Total Points on Profile)
            // Fetch updated points from DB first if needed, or just send the increment
           await updateCleverTapProfile(identity, {
                "Total_Reward_Points": { "$add": points },
                "Last_Reward_Type": "Order Reward"
            }, shop); // <--- ADDED SHOP PARAMETER HERE

            // ✅ STEP D: Active Event Send (Using SDK via our helper)
           await sendCleverTapEvent(identity, "Reward Points Active", {
                "Points": points,
                "Order_ID": orderId,
                "Status": "Active",
                "Message": "Points are now available to redeem"
            }, shop); // <--- ADDED SHOP PARAMETER HERE

        } catch (error) {
            console.error("❌ [DELAYED PROCESS ERROR]", error.message);
        }

    }, 120000); 
};
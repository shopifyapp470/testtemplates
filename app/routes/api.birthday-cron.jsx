import { data } from "react-router"; 
import db from "../db.server";
import { updateCleverTapWallet, sendCleverTapEvent } from "../utils/clevertap.server";

export const loader = async ({ request }) => {
  console.log("\n🎁 [DAILY CRON START] Checking Birthdays & Anniversaries...");
  try {
    const today = new Date();
    //const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const currentMonth = today.getMonth() + 1; 
    const currentDay = today.getDate();        
    const currentYear = today.getFullYear();   
    console.log(`📅 Date: ${currentDay}/${currentMonth}/${currentYear}`);
    const allUsers = await db.rewardpoint.findMany({
      where: {
        OR: [
          { dob: { not: null } },
          { anniversaryDate: { not: null } }
        ]
      }
    });

    if (allUsers.length === 0) {
      console.log("ℹ️ No users found with Birthday/Anniversary dates.");
      return data({ status: "No users with dates found" });
    }
    let processedCount = 0;
    for (const user of allUsers) {
      const shop = user.store;
      const identity = user.customeremail || user.customerid;
      const settings = await db.userbirthday.findUnique({ where: { shop: shop } });
      const settingBPoints = settings?.birthdayPoint || 0;
      const settingAPoints = settings?.anniversaryPoint || 0; 

      let totalPointsToAdd = 0;
      let dbUpdateData = {}; 
      let rewardMessages = []; 
      // --- CHECK 1: BIRTHDAY ---
      if (user.dob && settingBPoints > 0) {
        const dob = new Date(user.dob);
        const isBirthday = dob.getMonth() + 1 === currentMonth && dob.getDate() === currentDay;
        const notRewardedYet = user.lastBirthdayRewardYear !== currentYear;
        if (isBirthday && notRewardedYet) {
            console.log(`\n🎂 Birthday Found: ${identity} (Points: ${settingBPoints})`);
            totalPointsToAdd += settingBPoints;
            dbUpdateData.birthdayPoint = settingBPoints; 
            dbUpdateData.lastBirthdayRewardYear = currentYear;
            rewardMessages.push("Birthday");

            try {
                await sendCleverTapEvent(identity, "User Birthday", {
                    "Points_Gifted": settingBPoints,
                    "Date": today.toISOString().split('T')[0],
                    "Message": "Happy Birthday!"
                }, shop);
            } catch (e) {
                console.error(`❌ [EVENT ERROR] Birthday event failed:`, e.message);
            }
        }
      }
      // --- CHECK 2: ANNIVERSARY ---
      if (user.anniversaryDate && settingAPoints > 0) {
        const anniv = new Date(user.anniversaryDate);
        const isAnniversary = anniv.getMonth() + 1 === currentMonth && anniv.getDate() === currentDay;
        const notRewardedYet = user.lastAnniversaryRewardYear !== currentYear;
        if (isAnniversary && notRewardedYet) {
            console.log(`\n💍 Anniversary Found: ${identity} (Points: ${settingAPoints})`);
            totalPointsToAdd += settingAPoints;
            dbUpdateData.anniversaryPoint = settingAPoints;
            dbUpdateData.lastAnniversaryRewardYear = currentYear;
            rewardMessages.push("Anniversary");
            try {
                await sendCleverTapEvent(identity, "User Anniversary", {
                    "Points_Gifted": settingAPoints,
                    "Date": today.toISOString().split('T')[0],
                    "Message": "Happy Anniversary!"
                }, shop);
            } catch (e) {
                console.error(`❌ [EVENT ERROR] Anniversary event failed:`, e.message);
            }
        }
      }
      // --- FINAL EXECUTION ---
      if (totalPointsToAdd > 0) {
          await db.rewardpoint.update({
            where: { id: user.id },
            data: { 
                activepoint: { increment: totalPointsToAdd },
                pointvalue: { increment: totalPointsToAdd },
                ...dbUpdateData 
            }
          });
          console.log(`💾 [DB SAVED] Customer: ${identity} | Added Points: ${totalPointsToAdd}`);
          // ✅ FIX: Use "and" instead of "&" to prevent XSS Error
          const reasonString = rewardMessages.join(" and "); 
          const transactionId = `GIFT-${currentYear}-${currentMonth}-${currentDay}-${user.customerid}`;
          console.log(`🚀 [CLEVERTAP] Attempting to Credit Wallet...`);
          try {
             const ctResponse = await updateCleverTapWallet(
                identity,
                totalPointsToAdd,
                "CREDIT",
                transactionId,
                0, 
                `Reward for ${reasonString}`, // Description
                shop,
                "ACTIVE"
             );
             console.log(`✅ [CLEVERTAP SUCCESS] Wallet updated for ${identity}`);
             console.log(`   Response:`, JSON.stringify(ctResponse));
          } catch (ctError) {
             console.error(`❌ [CLEVERTAP FAILED] Could not update wallet for ${identity}`);
             console.error(`   Error Message:`, ctError.message);
          }
          processedCount++;
      }
    }
    console.log(`\n🏁 [CRON FINISHED] Processed ${processedCount} users.`);
    return data({ status: "Success", processed_users: processedCount });
  } catch (error) {
    console.error("\n❌ [CRON FATAL ERROR]", error);
    return data({ status: "Error", message: error.message }, { status: 500 });
  }
};
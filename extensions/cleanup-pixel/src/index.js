import { register } from "@shopify/web-pixels-extension";
 
register(({ analytics, browser }) => {
  // 1. UTM capture karke session storage mein save karein
  analytics.subscribe('page_viewed', async (event) => {
   console.log('test');
;  });
 
  // 2. Checkout complete hone par session clear karein
  analytics.subscribe('checkout_completed', async (event) => {
    console.log("🏁 [PIXEL] Order complete. Cleaning storage...");
    await browser.localStorage.removeItem('referred_by_employee');
    console.log("✅ [PIXEL] Storage cleared.");
  });
});
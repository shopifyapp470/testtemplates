import { register } from "@shopify/web-pixels-extension";
 
register(({ analytics, browser }) => {
  // 1. UTM capture karke session storage mein save karein
 analytics.subscribe('page_viewed', async (event) => {
    const url = new URL(event.context.document.location.href);
    const employeeEmail = url.searchParams.get("utm_source");
    
    if (employeeEmail) {
      // SessionStorage use karein kyunki yeh private mode mein bhi stable hai
      await browser.sessionStorage.setItem("referred_by_employee", employeeEmail);
      console.log("🎯 [PIXEL] Referral captured from URL:", employeeEmail);
    }
  });
 
  // 2. Checkout complete hone par session clear karein
  analytics.subscribe('checkout_completed', async (event) => {
    console.log("🏁 [PIXEL] Order complete. Cleaning storage...");
    await browser.localStorage.removeItem('referred_by_employee');
    console.log("✅ [PIXEL] Storage cleared.");
  });
});
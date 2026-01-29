import { register } from "@shopify/web-pixels-extension";
 
register(({ analytics, browser }) => {
  // 1. UTM capture karke session storage mein save karein
  analytics.subscribe('page_viewed', async (event) => {
    const url = new URL(event.context.document.location.href);
    const employeeEmail = url.searchParams.get("utm_source");
    if (employeeEmail) {
      await browser.sessionStorage.setItem("referred_employee", employeeEmail);
    }
  });
 
  // 2. Checkout complete hone par session clear karein
  analytics.subscribe('checkout_completed', async (event) => {
    console.log("🏁 [PIXEL] Order complete. Cleaning session storage...");
    await browser.sessionStorage.removeItem("referred_employee");
  });
});
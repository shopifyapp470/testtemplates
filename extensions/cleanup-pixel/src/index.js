import {register} from "@shopify/web-pixels-extension";
 
//register(({ analytics, browser, init, settings }) => {
    // Bootstrap and insert pixel script tag here
 
    // Sample subscribe to page view
 
register(({ analytics, browser }) => {
  // 1. UTM Source (Employee Email) capture karke session storage mein save karein
  analytics.subscribe('page_viewed', async (event) => {
    const url = new URL(event.context.document.location.href);
    const employeeEmail = url.searchParams.get("utm_source");
   
    if (employeeEmail) {
      await browser.sessionStorage.setItem("referred_employee", employeeEmail);
    }
  });
 
  // 2. Checkout complete hone par App Proxy ko hit karein
  analytics.subscribe('checkout_completed', async (event) => {
    try {
      const employeeEmail = await browser.sessionStorage.getItem("referred_employee");
      if (!employeeEmail) return;
 
      const checkout = event.data.checkout;
      const shopDomain = event.context.window.location.hostname;
 
      // ✅ FIX: Direct Render URL ki jagah App Proxy path use karein
      // Signature verification ke liye window params (?shop=...&signature=...) bhejna zaroori hai
      const searchParams = event.context.window.location.search;
      const proxyUrl = `https://${shopDomain}/apps/public/track-handler${searchParams}`;
 
      await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeEmail,
          customerEmail: checkout.email,
          orderId: checkout.order?.id,
          orderNumber: checkout.order?.name,
          totalAmount: checkout.totalPrice?.amount,
          shop: shopDomain,
        }),
      });
 
      // Cleanup
      await browser.sessionStorage.removeItem("referred_employee");
    } catch (err) {
      console.error("Pixel Tracking Error:", err);
    }
  });
});
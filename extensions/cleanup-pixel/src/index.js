import { register } from "@shopify/web-pixels-extension";
 
register(({ analytics, browser }) => {
  // 1. UTM Capture
  analytics.subscribe('page_viewed', async (event) => {
    const url = new URL(event.context.document.location.href);
    const employeeEmail = url.searchParams.get("utm_source");
    if (employeeEmail) {
      await browser.sessionStorage.setItem("referred_employee", employeeEmail);
    }
  });
 
  // 2. Checkout Complete
  analytics.subscribe('checkout_completed', async (event) => {
    try {
      const employeeEmail = await browser.sessionStorage.getItem("referred_employee");
      if (!employeeEmail) return;
 
      const checkout = event.data.checkout;
      const shopDomain = event.context.window.location.hostname;
 
      // App Proxy URL: Yahan /apps/public/ wahi hai jo aapne toml mein define kiya hai
      // Query parameters pass karna zaroori hai authentication ke liye
      const searchParams = event.context.window.location.search;
      const proxyUrl = `https://${shopDomain}/apps/public/referral-handler${searchParams}`;
 
      await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeEmail,
          customerEmail: checkout.email,
          orderId: checkout.order?.id,
          orderNumber: checkout.order?.name,
          totalAmount: checkout.totalPrice?.amount,
          shop: shopDomain,
        }),
      });
 
      await browser.sessionStorage.removeItem("referred_employee");
    } catch (err) {
      console.error("Pixel Error:", err);
    }
  });
});
 
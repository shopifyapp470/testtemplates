import { register } from "@shopify/web-pixels-extension";
 
register(({ analytics, browser }) => {
  analytics.subscribe('checkout_completed', async (event) => {
    console.log("🏁 [PIXEL] Checkout Completed Event Triggered");
 
    try {
      const employeeEmail = await browser.sessionStorage.getItem("referred_employee");
      
      if (!employeeEmail) {
        console.warn("🚫 [PIXEL] No employee email found in session storage. Skipping.");
        return;
      }
 
      const checkout = event.data.checkout;
      const payload = {
        employeeEmail,
        customerEmail: checkout.email,
        orderId: checkout.order?.id,
        orderNumber: checkout.order?.name,
        totalAmount: checkout.totalPrice?.amount,
        shop: event.context.window.location.hostname,
      };
 
      console.log("📤 [PIXEL] Sending data to backend:", payload);
 
      const response = await fetch("https://shopify-rewards-app.onrender.com/app/custom-proxy/track-handler", {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
 
      if (response.ok) {
        const resData = await response.json();
        console.log("🎉 [PIXEL] Backend Response Success:", resData);
      } else {
        console.error("❌ [PIXEL] Backend Error Status:", response.status);
      }
 
    } catch (err) {
      console.error("🚨 [PIXEL] Fetch Catch Error:", err);
    }
  });
});
 
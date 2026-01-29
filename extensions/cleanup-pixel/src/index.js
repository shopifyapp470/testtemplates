import {register} from "@shopify/web-pixels-extension";

// register(({ analytics, browser, init, settings }) => {
//     // Bootstrap and insert pixel script tag here

//     // Sample subscribe to page view
//     analytics.subscribe('page_viewed', (event) => {
//       console.log('Page viewed', event);
//     });
// });


register(({ analytics, browser }) => {
  analytics.subscribe('page_viewed', async (event) => {
    const url = new URL(event.context.document.location.href);
    const employeeEmail = url.searchParams.get("utm_source");
    if (employeeEmail) {
      await browser.sessionStorage.setItem("referred_employee", employeeEmail);
    }
  });
 
  analytics.subscribe('checkout_completed', async (event) => {
    try {
      const employeeEmail = await browser.sessionStorage.getItem("referred_employee");
      if (!employeeEmail) return;
 
      const checkout = event.data.checkout;
     
      // Direct call to Render to avoid RestrictedUrlError
      await fetch("https://testtemplates.onrender.com/app/custom-proxy/track-handler", {
        method: "POST",
        mode: "cors", // Explicitly enable CORS
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeEmail,
          customerEmail: checkout.email,
          orderId: checkout.order?.id,
          orderNumber: checkout.order?.name,
          totalAmount: checkout.totalPrice?.amount,
          shop: event.context.window.location.hostname,
        }),
      });
 
      await browser.sessionStorage.removeItem("referred_employee");
    } catch (err) {
      console.error("Pixel Fetch Error:", err);
    }
  });
});
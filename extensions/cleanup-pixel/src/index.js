import { register } from "@shopify/web-pixels-extension";
 
register(({ analytics, browser }) => {
  
  // 1. URL se Referral ID (utm_source) nikalna aur Save karna
  analytics.subscribe('page_viewed', async (event) => {
    const url = new URL(event.context.document.location.href);
    const employeeEmail = url.searchParams.get("utm_source");
    
    if (employeeEmail) {
      
      // Data ko save karein taaki registration page tak yaad rahe
      await browser.sessionStorage.setItem("referred_by_employee", employeeEmail);
      console.log("🎯 [PIXEL] Referral Captured:", employeeEmail);
    }
  });
 
  // 2. Customer Registration Tracking
  analytics.subscribe('customer_registered', async (event) => {
    const customer = event.data.customer;
    const customerId = customer?.id;
    const customerEmail = customer?.email;
    
    // Storage se Employee ki Email nikalna
    const referrer = await browser.sessionStorage.getItem("referred_by_employee");
 
    if (referrer) {
      console.log(`✅ [SUCCESS] New User Registered!`);
      console.log(`👤 Customer: ${customerEmail} (ID: ${customerId})`);
      console.log(`🔗 Referred By Employee: ${referrer}`);
      
      // OPTIONAL: Yahan aap apni API call kar sakte hain data save karne ke liye
      // fetch('https://your-api.com/track-referral', { method: 'POST', body: JSON.stringify({ referrer, customerEmail }) });
      
    } else {
      console.log("ℹ️ [PIXEL] New Customer Registered (Direct/No Referral)");
    }
  });
 
  // 3. Cleanup after Checkout (Zaruri hai taaki naye order par purana data na dikhe)
  analytics.subscribe('checkout_completed', async (event) => {
    await browser.sessionStorage.removeItem('referred_by_employee');
    console.log("🏁 [PIXEL] Flow Complete. Storage cleared.");
  });
});
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { deleteRewardTemplate } from "../lib/theme-file-delete.js";


export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  // if (session) {
  //   await db.session.deleteMany({ where: { shop } });
  // }

  if (topic === "APP_UNINSTALLED") {    
     if (session && admin) {
             await deleteRewardTemplate(admin, session);            
             db.session.deleteMany({ where: { shop } }); 
             console.log(`Cleanup and Session removal done for ${shop}`); 
      } 
  }

  return new Response();
};

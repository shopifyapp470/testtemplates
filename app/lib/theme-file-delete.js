// Is file mein Page aur Assets delete karne ka logic hai
 
export async function deleteRewardTemplate(admin, session) {
  const { shop, accessToken } = session;
  
  try {
    // 1. Pehle Active (Live) Theme ki ID fetch karein
    const themeResponse = await admin.graphql(`
      query { 
        themes(first: 10) { 
          nodes { id role } 
        } 
      }
    `);
    const themeData = await themeResponse.json();
    const mainTheme = themeData.data?.themes?.nodes.find(t => t.role === "MAIN");
 
    if (mainTheme) {
      // GraphQL ID (gid://...) se sirf number nikalna
      const THEME_ID = mainTheme.id.split("/").pop();
 
      // 2. REST API ka use karke JSON Template file delete karna
      // Note: API Version 2026-04 wahi hai jo aapne toml mein set kiya hai
     const assetUrl = `https://${shop}/admin/api/2026-04/themes/${THEME_ID}/assets.json?asset[key]=templates/page.reward-redeem.json`;
      
      const response = await fetch(assetUrl, {
        method: "DELETE",
        headers: { 
          "X-Shopify-Access-Token": accessToken 
        },
      });
 
      if (response.ok) {
        console.log("✅ Theme file 'page.reward-redeem.json' deleted successfully.");
      }
    }
 
    // 3. 'my-rewards' handle wale Page ko search karke delete karna
    const pageLookup = await admin.graphql(`
      query { 
        pages(first: 1, query: "handle:my-rewards") { 
          nodes { id } 
        } 
      }
    `);
    const pageData = await pageLookup.json();
    const pageId = pageData.data?.pages?.nodes[0]?.id;
 
    if (pageId) {
      await admin.graphql(`
        mutation pageDelete($id: ID!) { 
          pageDelete(id: $id) { 
            deletedPageId 
            userErrors { message }
          } 
        }
      `, { variables: { id: pageId } });
      
      console.log("✅ Page 'My Rewards' deleted successfully.");
    }
    
  } catch (error) { 
    console.error("❌ Cleanup Error:", error.message); 
  }
}
 
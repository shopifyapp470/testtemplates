export async function syncRewardTemplate(admin, session) {
  const { shop, accessToken } = session;
  const APP_HANDLE = "testtemplated"; // shopify.app.toml wala handle yaha likhein
  const BLOCK_HANDLE = "testtemplated";
 
  try {
    // ✅ STEP 1: GraphQL se Active Theme ID fetch karna (REST ki error fix karne ke liye)
    const themeResponse = await admin.graphql(`
      query {
        themes(first: 10) {
          nodes {
            id
            role
          }
        }
      }
    `);
 
    const themeData = await themeResponse.json();
    const mainTheme = themeData.data?.themes?.nodes.find(t => t.role === "MAIN");
   
 
    if (!mainTheme) {
      throw new Error("Active theme nahi mila.");
    }
 
    // GraphQL ID format "gid://shopify/Theme/123456" hota hai, hume sirf number chahiye
    const THEME_ID = mainTheme.id.split("/").pop();
 
   
 
    // 2. Physical .json file content tayyar karna
    const templateJSON = {
      "sections": {
        "main": {
          "type": "main-page",
          "disabled": true,
          "settings": {
            "padding_top": 36,
            "padding_bottom": 28
          }
        },
        "reward_apps_container": {
          "type": "apps",
          "blocks": {
            "reward_app_block": {
              "type": `shopify://apps/${APP_HANDLE}/blocks/${BLOCK_HANDLE}`,
              "settings": {
                "hero_title": "Your Reward Points",
                "hero_subtitle": "You may redeem on your next purchase",
                "redeem_title": "How to Redeem",
                "redeem_desc": "Redeem your points during checkout...",
                "policy_title": "Reward Points Policy",
                "policy_1": "Maximum points value cannot exceed order value",
                "policy_2": "Reward Points never expire",
                "policy_3": "Non-transferable between accounts"
              }
            }
          },
          "block_order": ["reward_app_block"],
          "settings": {
            "include_margins": true
          }
        }
      },
      "order": ["main", "reward_apps_container"]
    };
 
    // 3. REST API: templates/page.reward-redeem.json create/update karna
    const assetUrl = `https://${shop}/admin/api/2025-10/themes/${THEME_ID}/assets.json`;
   
    const assetResponse = await fetch(assetUrl, {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        asset: {
          key: "templates/page.reward-redeem.json",
          value: JSON.stringify(templateJSON),
        },
      }),
    });
 
    if (!assetResponse.ok) {
      const errorText = await assetResponse.text();
      // 'main-page' fallback logic
      if (errorText.includes("main-page")) {
          templateJSON.sections.main.type = "page";
          await fetch(assetUrl, {
             method: "PUT",
             headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
             body: JSON.stringify({ asset: { key: "templates/page.reward-redeem.json", value: JSON.stringify(templateJSON) } })
          });
      } else {
        throw new Error(`Asset API Error: ${errorText}`);
      }
    }
 
    // 4. GraphQL: Page create karna
    await admin.graphql(
      `#graphql
      mutation CreatePage($page: PageCreateInput!) {
        pageCreate(page: $page) {
          page { id }
          userErrors { message }
        }
      }`,
      {
        variables: {
          page: {
            title: "My Rewards123",
            handle: "my-rewards123",
            isPublished: true,
            templateSuffix: "reward-redeem"
          },
        },
      }
    );
 
    return { success: true, themeId: THEME_ID };
  } catch (error) {
    console.error("❌ Sync Error Fixed:", error.message);
    throw new Error(error.message);
  }
}
// app/routes/app.custom-proxy.jsx
import { authenticate, unauthenticated } from "../shopify.server";
import { data } from "react-router"; 
import db from "../db.server";

// =========================================================
// 1. LOADER (Handles GET Requests) -> Fetch Points
// =========================================================
export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return data({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  // ✅ Security: Shopify automatically sends this param in App Proxy
  const verifiedCustomerId = url.searchParams.get("logged_in_customer_id");

  if (!verifiedCustomerId) {
    return data({ success: false, message: "Customer not logged in" }, { status: 400 });
  }

  try {
    const rewardRecord = await db.rewardpoint.findFirst({
      where: {
        customerid: String(verifiedCustomerId), // Use verified ID
        store: session.shop,
      },
    });

    return data({ 
      success: true, 
      pointvalue: rewardRecord ? rewardRecord.pointvalue : 0,
      verifiedId: verifiedCustomerId // Frontend verification ke liye
    });

  } catch (error) {
    console.error("Loader Error:", error);
    return data({ success: false, message: "Server Error" }, { status: 500 });
  }
};

// =========================================================
// 2. ACTION (Handles POST Requests) -> Create Discount
// =========================================================
// export const action = async ({ request }) => {
//   const { session } = await authenticate.public.appProxy(request);

//   if (!session) {
//     return data({ error: "Unauthorized access" }, { status: 401 });
//   }

//   try {
//     const requestBody = await request.json();
//     const { customerId, userValue } = requestBody;

//     if (!userValue || isNaN(userValue) || parseFloat(userValue) <= 0) {
//       return data({ message: "Invalid amount provided" }, { status: 400 });
//     }

//     const formattedAmount = parseFloat(userValue).toFixed(2);
//     const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
//     const discountTitle = `REWARD-${customerId}-${formattedAmount}-${uniqueSuffix}`;
//     const shop = session.shop;

//     const { admin } = await unauthenticated.admin(shop);

//     const response = await admin.graphql(
//       `#graphql
//       mutation discountAutomaticBasicCreate($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
//         discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
//           automaticDiscountNode {
//             automaticDiscount {
//               ... on DiscountAutomaticBasic { title }
//             }
//           }
//           userErrors { field message }
//         }
//       }`,
//       {
//         variables: {
//           automaticBasicDiscount: {
//             title: discountTitle,
//             startsAt: new Date().toISOString(),
//             minimumRequirement: { subtotal: { greaterThanOrEqualToSubtotal: "1.00" } },
//             customerGets: {
//               value: { discountAmount: { amount: formattedAmount, appliesOnEachItem: false } },
//               items: { all: true }
//             }
//           }
//         }
//       }
//     );

//     const responseJson = await response.json();
//     const userErrors = responseJson.data?.discountAutomaticBasicCreate?.userErrors;

//     if (userErrors && userErrors.length > 0) {
//       return data({ message: "Failed to create discount", errors: userErrors }, { status: 400 });
//     }

//     const createdDiscount = responseJson.data?.discountAutomaticBasicCreate?.automaticDiscountNode?.automaticDiscount;

//     return data(
//       {
//         message: "Discount Created Successfully!",
//         received_data: {
//           discountTitle: createdDiscount.title,
//           amount: formattedAmount
//         }
//       },
//       { status: 200 }
//     );

//   } catch (error) {
//     console.error("Action Error:", error);
//     return data({ error: "Server Error" }, { status: 500 });
//   }
// };
export const action = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  
  if (!session) return data({ error: "Unauthorized" }, { status: 401 });

  const shop = session.shop;

  const url = new URL(request.url);
  const verifiedCustomerId = url.searchParams.get("logged_in_customer_id");

  if (!verifiedCustomerId) {
    return data({ error: "Customer session expired. Please login again." }, { status: 403 });
  }

  try {
    const { userValue } = await request.json();
    const pointsToRedeem = parseFloat(userValue);
    const settings = await db.userbirthday.findFirst({ where: { shop: shop } });
    const ratio = settings?.allearnPercentage ? parseFloat(settings.allearnPercentage) / 100 : 0.10;
    const discountAmount = (pointsToRedeem * ratio).toFixed(2);

    // 1. Check points for the VERIFIED customer
    const rewardRecord = await db.rewardpoint.findFirst({
      where: { customerid: String(verifiedCustomerId), store: shop }
    });

    if (!rewardRecord || rewardRecord.pointvalue < parseFloat(userValue)) {
      return data({ message: "Aapke paas paryapt points nahi hain." }, { status: 400 });
    }

    // 2. Discount Code Configuration
    const formattedAmount = parseFloat(userValue).toFixed(2);
    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
    // Format: REWARD-CUSTOMERID-POINTS-RANDOM
    const discountTitle = `REWARD-${verifiedCustomerId}-${Math.floor(userValue)}-${uniqueSuffix}`; 

    const { admin } = await unauthenticated.admin(shop);
    
    const response = await admin.graphql(
      `#graphql
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode { codeDiscount { ... on DiscountCodeBasic { title } } }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          basicCodeDiscount: {
            title: discountTitle,
            code: discountTitle,
            startsAt: new Date().toISOString(),
            customerSelection: { 
                customers: { add: [`gid://shopify/Customer/${verifiedCustomerId}`] } 
            },
            customerGets: {
              value: { discountAmount: { amount: discountAmount, appliesOnEachItem: false } },
              items: { all: true }
            },
            appliesOncePerCustomer: true,
            usageLimit: 1
          }
        }
      }
    );

    const responseJson = await response.json();
    const errors = responseJson.data?.discountCodeBasicCreate?.userErrors;

    if (errors && errors.length > 0) {
        return data({ success: false, message: errors[0].message }, { status: 400 });
    }

    return data({ 
        success: true, 
        discountTitle: discountTitle,
        ownerId: verifiedCustomerId 
    });

  } catch (error) {
    console.error("Action Error:", error);
    return data({ error: "Server Error" }, { status: 500 });
  }
};

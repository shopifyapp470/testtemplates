import { data } from "react-router"; 
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
 
export const loader = async ({ request }) => {
  const { liquid } = await authenticate.public.appProxy(request);
 
  if (!liquid) {
    return data({ error: "Unauthorized" }, { status: 401 });
  }
 
  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id");
  const shop = url.searchParams.get("shop");
 
  if (!customerId) {
    return data({ error: "Customer not found" }, { status: 404 });
  }
 
  const rewardData = await prisma.rewardpoint.findFirst({
    where: {
      customerid: customerId,
      store: shop,
    },
    include: {
      orders: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
 
  if (!rewardData) {
    return data({ 
      orders: [], 
      currentBalance: 0, 
      lifetimeSavings: 0, 
      birthdayPoint: 0, 
      anniversaryPoint: 0 
    });
  }
 
  // --- CALCULATIONS LOGIC ---
 
  // 1. Lifetime Savings (Sirf Total Kamayi): 
  // Isme hum 'pointsRedeemed' ko minus NAHI karenge. 
  // Sirf pointsEarned aur highRewardPoint ko plus karenge.
  const calculatedLifetime = rewardData.orders.reduce((sum, order) => {
    if (order.status === 'CANCELLED') return sum;
    return sum + (Number(order.pointsEarned) || 0) + (Number(order.highRewardPoint) || 0);
  }, 0);
 
  // Isme Birthday aur Anniversary points bhi add kar dete hain jo extra mile hain
  const totalLifetime = calculatedLifetime + (rewardData.birthdayPoint || 0) + (rewardData.anniversaryPoint || 0);
 
  // 2. Current Balance: Jo points abhi bache hain
  // Aapke schema ke mutabiq 'activepoint' hi bacha hua balance hai.
  const currentBalance = rewardData.activepoint || 0;
 
  return data({
    orders: rewardData.orders,
    currentBalance: currentBalance,    // Dashboard Card 1
    lifetimeSavings: totalLifetime,    // Dashboard Card 2
    birthdayPoint: rewardData.birthdayPoint || 0,
    anniversaryPoint: rewardData.anniversaryPoint || 0,
  });
};
 
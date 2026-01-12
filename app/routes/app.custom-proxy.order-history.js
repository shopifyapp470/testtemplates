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
    // Agar customer ka record nahi hai to 0 points bhejenge
    return data({ orders: [], totalPoints: 0,  currentBalance: 0, 
      lifetimeSavings: 0, birthdayPoint: 0, 
      anniversaryPoint: 0, pendingPoints: 0 });
  }

    // --- CALCULATIONS LOGIC ---
 
  // 1. Lifetime Savings: Total points jo shuru se ab tak earn huye hain
  // Hum un points ko jodenge jo orders se mile hain (Cancelled orders ko exclude karke)
  const lifetimeSavings = rewardData.orders.reduce((sum, order) => {
    if (order.status === 'CANCELLED') return sum;
    // pointsEarned + highRewardPoint (jo scheme mein humne calculate kiye hain)
    return sum + (Number(order.pointsEarned) || 0) + (Number(order.highRewardPoint) || 0);
  }, 0);
 
  // 2. Current Balance: Jo points abhi customer ke paas kharch karne ke liye bache hain
  // Aapke schema mein 'activepoint' current balance ko represent karta hai
  const currentBalance = rewardData.activepoint || 0;
 

  // Yahan hum Database se 'pointvalue' bhej rahe hain
  return data({
    orders: rewardData.orders,
     currentBalance: currentBalance,    // Yeh Dashboard ke pehle box ke liye hai
    lifetimeSavings: lifetimeSavings,  // Yeh Dashboard ke doosre box ke liye hai
    totalPoints: rewardData.pointvalue, // ✅ Ye aapka current balance hai
    birthdayPoint: rewardData.birthdayPoint || 0, // Prisma model se birthdayPoint
    anniversaryPoint: rewardData.anniversaryPoint || 0, // Prisma model se anniversaryPoint
    pendingPoints: rewardData.pendingpoint || 0, 
  });
};
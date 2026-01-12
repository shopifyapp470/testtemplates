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
    return data({ orders: [], totalPoints: 0, birthdayPoint: 0, 
      anniversaryPoint: 0, pendingPoints: 0 });
  }




  
  // Yahan hum Database se 'pointvalue' bhej rahe hain
  return data({
    orders: rewardData.orders,
    totalPoints: rewardData.pointvalue, // ✅ Ye aapka current balance hai
    lifetimeSavings: lifetimeSavings, // ✅ Ye aapka lifetime savings hai
    currentBalance: currentBalance, // ✅ Ye aapka current balance hai
    birthdayPoint: rewardData.birthdayPoint || 0, // Prisma model se birthdayPoint
    anniversaryPoint: rewardData.anniversaryPoint || 0, // Prisma model se anniversaryPoint
    pendingPoints: rewardData.pendingpoint || 0, 
  });
};
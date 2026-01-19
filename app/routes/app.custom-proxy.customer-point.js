import { data } from "react-router"; 
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  
  // URL parameters
  const customerId = url.searchParams.get("customerId");
  const shop = url.searchParams.get("shop");

  // Basic validation
  if (!customerId || !shop) {
    return data({ points: 0, error: "Missing customerId or shop" }, { status: 400 });
  }

  try {
    // Prisma query
    const rewardRecord = await prisma.rewardpoint.findFirst({
      where: {
        customerid: customerId, 
        store: shop
      },
      select: {
        pointvalue: true
      }
    });

    return data({ 
      points: rewardRecord ? rewardRecord.pointvalue : 0 
    });
    
  } catch (error) {
    console.error("Prisma Error Details:", error);
    return data({ points: 0, error: "Database connection failed" }, { status: 500 });
  }
};

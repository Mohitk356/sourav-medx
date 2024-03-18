"use client";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import TagManager from "react-gtm-module";
import { db } from "../../config/firebase-config";
import { useAppSelector } from "../../redux/hooks";

const PaymentSuccess = ({ searchParams }) => {
  const stripe = require("stripe")(process.env.NEXT_PUBLIC_STRIPE_SECRET);
  const [dataPushed, setDataPushed] = useState(false);
  const { currRate, currency } = useAppSelector(
    (state: any) => state.appReducer
  );
  // const

  async function updateRecord() {
    if (searchParams?.redirect_status === "succeeded") {
      if (searchParams?.orderId) {
        const order = await getDoc(doc(db, "orders", searchParams?.orderId));
        const data = order.data();
        const paymentIntent = await stripe.paymentIntents.update(
          searchParams.paymentId,
          {
            description: `Medx Pharmacy - OrderId: ${data.orderId}`,
          }
        );
        TagManager.dataLayer({
          dataLayer: {
            event: "purchase",
            value: (data?.totalAmountToPaid * currRate).toFixed(2),
            tax: (data?.defaultGst * currRate).toFixed(2),
            shipping: (data?.delivery * currRate).toFixed(2),
            currency: data?.currency,
          },
        });
        await updateDoc(doc(db, "orders", searchParams?.orderId), {
          status: "Confirmed",
          "payment.completed": true,
          "payment.details": {
            paymentIntent: searchParams?.payment_intent || "",
          },
        });
      }
    }
    setDataPushed(true);
    // createButton();
  }

  useEffect(() => {
    updateRecord();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <div>
        <h1 className="text-2xl font-semibold">
          {searchParams?.mode && searchParams?.mode === "cash"
            ? "Order Placed Successfully"
            : "Your Payment Was Successfull"}
        </h1>
      </div>
      <div>
        <h1 className="text-lg font-medium text-gray-600">
          {searchParams?.mode && searchParams?.mode === "cash"
            ? "Check your order details from My orders section in profile"
            : "Order Placed Successfully"}
        </h1>
      </div>

      <Link href={"/"} className="bg-primary text-white px-3 py-1 rounded-md">
        Go To Home
      </Link>
    </div>
  );
};

export default PaymentSuccess;

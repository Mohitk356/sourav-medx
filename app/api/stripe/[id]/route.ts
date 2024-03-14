import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../config/firebase-config";
import { FaTable } from "react-icons/fa";

export const GET = async (req: NextRequest, { params }) => {
  try {
    const stripe = require("stripe")(process.env.NEXT_PUBLIC_STRIPE_SECRET);
    const payment_intent = req.nextUrl.searchParams.get("payment_intent");

    const data = await getDoc(doc(db, "tmpOrders", params.id));
    const order = data.data();

    await setDoc(doc(db, "orders", data.id), order);
    // Delete Tmp Orders
    // await deleteDoc(doc(db, "tmpOrders", data.id));

    const newOrderData = await getDoc(doc(db, "orders", data.id));
    const orderData = newOrderData.data();

    // const paymentIntent = await stripe.paymentIntents.update(payment_intent, {
    //   description: `Medx Pharmacy - OrderId: ${orderId}`,
    // });

    return NextResponse.redirect(
      process.env.NEXT_PUBLIC_API_DOMAIN +
        `/payment-success?orderId=${newOrderData.id}&redirect_status=succeeded&paymentId=${payment_intent}`
    );
  } catch (error) {
    console.log(error);

    return NextResponse.json({ error: error.toString() });
  }

  // return NextResponse.json({
  //   order: payment_intent,
  // });
};

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../../config/firebase-config";
import { NextResponse } from "next/server";
const stripe = require("stripe")(process.env.NEXT_PUBLIC_STRIPE_SECRET);
export const GET = async () => {
  const Query = query(collection(db, "orders"), where("orderId", "==", null));
  const querySnapshot = await getDocs(Query);

  for (let i = 0; i < querySnapshot.docs.length; i++) {
    const element = querySnapshot.docs[i].data();
    const metadata = await getDoc(doc(db, "ordersMetaData", "metadata"));
    const lasorderId = (metadata.data().lastOrderId || 1001) + 1;
    await updateDoc(doc(db, "orders", querySnapshot.docs[i].id), {
      orderId: lasorderId,
    });
    if (
      element.payment.mode != "cash" &&
      element.payment.paymentIntent &&
      element.payment.paymentIntent != ""
    ) {
      await stripe.paymentIntents.update(element.payment.paymentIntent, {
        description: `Medx Pharmacy - OrderId: ${lasorderId} Updated`,
      });
    }

    await updateDoc(doc(db, "ordersMetaData", "metadata"), {
      lastOrderId: lasorderId,
    });
  }
  return NextResponse.json({ status: "Task Done" });
};

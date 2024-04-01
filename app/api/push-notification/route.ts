import admin from "firebase-admin";
import { NextResponse } from "next/server";
import fbData from "../admin.json";
export const GET = async () => {
  if (admin.app.length == 0) {
    admin.initializeApp({
      credential: admin.credential.cert({
        clientEmail: fbData.client_email,
        privateKey: fbData.private_key,
        projectId: fbData.project_id,
      }),
    });
  }

  try {
    const fireStore = admin.firestore();
    const doc: admin.firestore.DocumentSnapshot<
      admin.firestore.DocumentData,
      admin.firestore.DocumentData
    > = await fireStore.collection("deviceTokens").doc("deviceIds").get();

    const ids = doc.data().ids;
    console.log(ids);

    const data = await admin.messaging().sendEachForMulticast({
      notification: {
        title: "Title of your notification",
        body: "Body of your notification",
      },
      tokens: ids,
      webpush: {
        notification: {
          title: "Title of your notification",
          body: "Body of your notification",
        },
      },
    });
    console.log(data);
    return NextResponse.json({ status: data, ok: true });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ status: error.toString() });
  }
};

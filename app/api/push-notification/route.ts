import admin from "firebase-admin";
import { NextRequest, NextResponse } from "next/server";
import fbData from "../../../admin.json";

export async function OPTIONS(request: Request) {
  const allowedOrigin = request.headers.get("origin");
  const response = new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version",
      "Access-Control-Max-Age": "86400",
    },
  });

  return response;
}

export const POST = async (req: NextRequest) => {
  var reqData = await req.json();

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        clientEmail: fbData.client_email,
        privateKey: fbData.private_key,
        projectId: fbData.project_id,
      }),
    });
  } catch (error) {
    console.log(error);
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
        title: reqData.title || "",
        body: reqData.body || "",
      },
      tokens: ids,
      webpush: {
        notification: {
          title: reqData.title || "",
          body: reqData.body || "",
        },
      },
      data: {
        title: reqData.title || "",
        body: reqData.body || "",
        slug: reqData.slug || "",
        image: reqData.image || "",
      },
    });
    console.log(data);
    return NextResponse.json({ status: data, ok: true });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ status: error.toString() });
  }
};

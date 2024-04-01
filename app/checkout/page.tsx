"use client";

import React, { useEffect, useState } from "react";
import CheckoutNav from "../../components/checkoutnav/CheckoutNav";
import CheckoutProgress from "../../components/checkoutnav/CheckoutProgress";
import NewAddress from "../../components/checkout/newAddress";
import { useQuery } from "@tanstack/react-query";
import {
  addAddressToUser,
  getCountries,
  getUserData,
  getWalletInfo,
  updateDefaultAddress,
} from "../../utils/databaseService";
import {
  checkIfProductQuanityIsAvailable,
  getCountry,
  initialAddress,
  makeLeastSignificantDigitZero,
  validateEmail,
} from "../../utils/utilities";
import { useAppSelector } from "../../redux/hooks";
import { toast } from "react-toastify";
import SubtotalComponent from "./SubTotalComponent";
import CouponSection from "../../components/checkout/CouponSection";
import CheckoutOrders from "../../components/checkout/CheckoutOrders";
import FbFunctions, { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "../../config/firebase-config";
import { getGstAppilicableInfo } from "../../utils/cartUtilities/cartUtility";
import { useRouter } from "next/navigation";
import { usePrevious } from "../../hooks/usePrevious";
import MakeCheckout from "../../components/checkout/stripe/MakeCheckout";
import { addDoc, collection, doc } from "firebase/firestore";
import { useDispatch } from "react-redux";
import { reset } from "../../redux/slices/cartSlice";
import { loadStripe } from "@stripe/stripe-js";
import axios from "axios";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { StripeElementsOptions } from "@stripe/stripe-js";
import { ValidateAddressError } from "../../utils/validate/AdddressError";
export interface PayState {
  pay: boolean;
  secret: string | null;
  orderId: string | null;
  payment_intent: string | null;
}

import PaymentBox from "./PaymentBox";
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC);
function CheckoutPage() {
  const { data: allowedCountries } = useQuery({
    queryKey: ["countries"],
    queryFn: () => getCountries(),
    keepPreviousData: true,
  });
  const { data: userData } = useQuery({
    queryKey: ["userData"],
    queryFn: () => getUserData(null),
    keepPreviousData: true,
  });
  const { data: walletInfo } = useQuery({
    queryKey: ["walletInfo"],
    queryFn: () => getWalletInfo(),
    keepPreviousData: true,
  });
  const { currRate, currency } = useAppSelector(
    (state: any) => state.appReducer
  );
  const cart = useAppSelector((state: any) => state.cartReducer.cart);
  const router = useRouter();
  const dispatch = useDispatch();
  const [showPay, setShowPay] = useState<PayState>({
    pay: false,
    secret: null,
    orderId: null,
    payment_intent: null,
  });
  const [isCashBackUsed, setIsCashbackUsed] = useState(false);
  const [cashBackUsed, setCashBackused] = useState(0);
  const [saveAddress, setSaveAddress] = useState(false);
  const [makeDefault, setMakeDefault] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isTermsAgreed, setIsTermsAgreed] = useState(false);
  const [overLayLoading, setOverLayLoading] = useState(false);
  const [isPaymentSummaryLoading, setIsPaymentSummaryLoading] = useState(false);
  const [makeDefaultAddress, setMakeDefaultAddress] = useState(true);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("online");
  const [userNote, setUserNote] = useState("");
  const [userName, setName]: any = useState({ first: "", last: "" });
  const [paymentSummary, setPaymentSummary] = useState(null);

  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [appliedCouponAmount, setAppliedCouponAmount] = useState(null);

  const [userAddress, setUserAddress] = useState(
    (userData && userData?.defaultAddress) || initialAddress
  );

  const [addressToDeliver, setAddressToDeliver] = useState(
    (userData && userData?.defaultAddress) || initialAddress
  );
  const prevValue = usePrevious(addressToDeliver?.country || "");

  const [isNewAddress, setIsNewAddress] = useState(
    !(userData && userData?.defaultAddress)
  );

  console.log(addressToDeliver);

  const handleChange = (name, value) => {
    setAddressToDeliver((val) => {
      return { ...val, [name]: value };
    });
  };

  async function getPaymentSummary() {
    if (!cart || (cart && cart.length === 0)) {
      router.push("/cart");
      return;
    }
    setIsPaymentSummaryLoading(true);
    //TODO: Firebase Internal Error --
    const getPaymentSummaryDetails = httpsCallable(
      functions,
      "orders-getOrderPaymentDetails"
    );

    const isGst = await getGstAppilicableInfo();
    let data = {
      address: {
        ...addressToDeliver,
        country: addressToDeliver?.country?.trim(),
      },
      products: cart,
      isGstApplicable: isGst,
      customDeliverySettings: null,
    };

    const res = await getPaymentSummaryDetails(data);

    setIsPaymentSummaryLoading(false);
    let summaryData: any = res.data;

    if (summaryData?.delivery?.country !== addressToDeliver?.country?.trim()) {
      return await getPaymentSummary();
    }

    setIsCouponApplied(false);
    setAppliedCouponAmount(null);
    setPaymentSummary(summaryData);
    console.log("Summery ", summaryData);
  }

  async function updatePaymentSummaryWithOverLayLoading() {
    setOverLayLoading(true);

    if (!cart || (cart && cart.length === 0)) {
      router.push("/cart");
      setOverLayLoading(false);
      return;
    }
    const getPaymentSummaryDetails = httpsCallable(
      functions,
      "orders-getOrderPaymentDetails"
    );

    const isGst = await getGstAppilicableInfo();
    let data = {
      address: {
        ...addressToDeliver,
        city: addressToDeliver?.state,
        country: addressToDeliver?.country?.trim(),
      },
      products: cart,
      isGstApplicable: isGst,
      customDeliverySettings: null,
    };
    const res: any = await getPaymentSummaryDetails(data);

    if (res?.data?.delivery?.country !== addressToDeliver?.country?.trim()) {
      return await updatePaymentSummaryWithOverLayLoading();
    }
    setIsCouponApplied(false);
    setAppliedCouponAmount(null);
    setPaymentSummary(res.data);
    setOverLayLoading(false);
  }

  // on handel submitt data

  function handleAddressSubmit() {
    const {
      address,
      city,
      lat,
      lng,
      name,
      phoneNo,
      pincode,
      state,
      country,
      stateCode,
      email,
    } = addressToDeliver;
    console.log(addressToDeliver);

    // if (!address || !city || !phoneNo || !state || !name) {
    //   console.log("ENTER DETAILS CORRECTLY", userAddress);
    //   return;
    // }

    // validate all data
    if (!name) {
      toast.error("Enter Your Name");
      return false;
    } else if (!email) {
      toast.error("Enter Your Email ID");
      return false;
    } else if (!validateEmail(email)) {
      toast.error("Enter A Valid Email ID");
      return false;
    } else if (phoneNo.length < 7 || phoneNo.length > 12) {
      toast.error("Enter A Valid Mobile Number");
      return false;
    } else if (!country) {
      toast.error("Enter Your country Name");
      return false;
    } else if (!city) {
      toast.error("Enter Your City Name");
      return false;
    } else if (!address) {
      toast.error("Enter Your Address");
      return false;
    }
    //  else if (!pincode) {
    //   toast.error("Enter Your Pincode");
    //   return false;
    // }

    if (makeDefaultAddress) {
      updateDefaultAddress({
        ...userAddress,
        country: getCountry(allowedCountries, currency)?.countryName,
      });
    }

    addAddressToUser({
      ...userAddress,
      country: getCountry(allowedCountries, currency)?.countryName,
    });
    setAddressToDeliver({
      ...userAddress,
      country: getCountry(allowedCountries, currency)?.countryName,
    });
  }

  useEffect(() => {
    getPaymentSummary();
  }, []);

  useEffect(() => {
    if (
      prevValue === "" ||
      addressToDeliver?.country === "United Arab Emirates" ||
      (prevValue === "United Arab Emirates" &&
        addressToDeliver?.country !== "United Arab Emirates")
    )
      updatePaymentSummaryWithOverLayLoading();
  }, [addressToDeliver?.country]);

  useEffect(() => {
    if (addressToDeliver?.country === "United Arab Emirates") {
      updatePaymentSummaryWithOverLayLoading();
    }
  }, [addressToDeliver?.state]);

  const onClientSecretSubmit = async (id) => {
    // if (elements == null) {
    //   return;
    // }

    // // Trigger form validation and wallet collection
    // const { error: submitError } = await elements.submit();
    // if (submitError) {
    //   // Show error to your customer
    //   toast.error(submitError.message + " on submit");
    //   return;
    // }

    const stripeData = {
      amount: Math.round(
        isCashBackUsed
          ? (paymentSummary?.totalPayable - cashBackUsed) * currRate
          : paymentSummary?.totalPayable * currRate
      ),
      currency: currency.toLowerCase(),
      user: {
        address: addressToDeliver,
        name: addressToDeliver?.name,
        phone: addressToDeliver?.phoneNo,
        email: addressToDeliver?.email,
      },
    };

    let amount: number;
    if (
      stripeData?.currency === "OMR" ||
      stripeData?.currency === "KWD" ||
      stripeData?.currency === "BHD"
    ) {
      amount = makeLeastSignificantDigitZero(
        parseFloat((stripeData?.amount).toFixed(2)) * 1000
      );
    } else {
      amount = parseInt(
        (parseFloat((stripeData?.amount).toFixed(2)) * 100)
          .toString()
          .split(".")[0]
      );
    }
    // Create the PaymentIntent and obtain clientSecret from your server endpoint
    setLoading(true);
    const res = await fetch(
      process.env.NEXT_PUBLIC_API_DOMAIN + "/api/stripe-intent",
      {
        method: "POST",
        body: JSON.stringify({
          ...stripeData,
          amount,
        }),
        headers: {
          "content-type": "application/json",
        },
      }
    );

    const data = await res?.json();
    console.log(data);

    const clientSecret = data.clientSecret;
    setShowPay({
      ...showPay,
      secret: clientSecret,
      pay: true,
      orderId: id,
      payment_intent: data.id,
    });
    setLoading(false);
    // alert(id);
    // const { error } = await stripe.confirmPayment({
    //   //`Elements` instance that was used to create the Payment Element
    //   elements,
    //   clientSecret,
    //   confirmParams: {
    //     return_url: process.env.NEXT_PUBLIC_API_DOMAIN + `/api/stripe/${id}`,
    //   },
    // });
    // // /${id}/complete/${clientSecret}
    // if (error) {
    //   toast.error("Payment Rejected");
    //   // router.push("/payment-failed");
    //   window.location.replace(
    //     process.env.NEXT_PUBLIC_API_DOMAIN +
    //       `/api/stripe/error/${id}?payment_intent=${data.id}`
    //   );
    //   console.log(error);
    // } else {
    //   // Your customer will be redirected to your `return_url`. For some payment
    //   // methods like iDEAL, your customer will be redirected to an intermediate
    //   // site first to authorize the payment, then redirected to the `return_url`.\
    //   setLoading(false);
    // }
  };

  function checkIfThereIsAnyProductWhichIsNotDeliverableToSelectedCountry() {
    let response = false;
    if (paymentSummary) {
      for (let index = 0; index < paymentSummary?.products.length; index++) {
        const element = paymentSummary?.products[index];
        if (
          element?.restrictedCountries &&
          element?.restrictedCountries?.includes(addressToDeliver?.country)
        ) {
          response = true;
          break;
        }
      }
    }
    return response;
  }

  async function placeNewOrder(isCod: boolean) {
    // const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC);

    if (!isTermsAgreed) {
      toast.error(
        "Please Agree to Terms & Conditions before placing your order"
      );
      return;
    }
    // if(addressToDeliver?.country)
    const { address, name, phoneNo, state, country, email }: any = {
      ...addressToDeliver,
    };

    if (!address || !phoneNo || !state || !name || !country) {
      toast.error("Please enter address correctly");
      return;
    } else if (!email) {
      toast.error("Please Enter Your Email ID");
      return;
    } else if (!validateEmail(email)) {
      toast.error("Invalid Email ID");
      return;
    }
    if (/^[0-9PayState]{3,14}$/.test(phoneNo) === false) {
      // alert(phoneNo);
      toast.error("Enter valid phone number without country code.");
      return;
    }

    if (
      addressToDeliver?.email &&
      /^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+$/.test(addressToDeliver?.email) ===
        false
    ) {
      toast.error("Enter valid email.");
      return;
    }

    // if (
    //   addressToDeliver?.pincode &&
    //   /^\d+$/.test(addressToDeliver?.pincode) === false
    // ) {
    //   toast.error("Enter valid pincode.");
    //   return;
    // }

    let orderObj = {
      delivery:
        addressToDeliver?.state === "Dubai"
          ? 0
          : paymentSummary?.delivery?.deliveryCost || 1,
      couponDiscount: 0,
      defaultGst: paymentSummary?.totalGst || 0,
      totalAmountToPaid: paymentSummary?.totalPayable,
      couponId: appliedCouponAmount ? appliedCouponAmount?.couponId : "", //coupon
      couponName: "", //coupon,
      scheduledDate: "",
      scheduledTime: "",
      totalMrp: paymentSummary?.totalMrp, // from backend
      discountOnMrp: paymentSummary?.discountOnMrp, // from backend
      deliveryGstObj: paymentSummary?.deliveryGstObj, // from backend
      customerGstNo: "",
      billingAddress: addressToDeliver,
      userNote: userNote || "",
      currency,
      description: userNote + ` Pay By ${isCod ? "COD" : "Online"}`,
      autoConfirmOrder: true, // collection payment -> info
      storePickupObj: {},
      metaData: {
        source: "web",
        orderBy: {
          id: userData ? userData?.id : "Guest",
          name: userData ? userData?.name : addressToDeliver?.name || "",
          role: "user",
        },
        inventoryManaged: false,
      },
      products: paymentSummary?.products,
      address: addressToDeliver,
      orderId: null,
      status: selectedPaymentMethod === "cash" ? "Confirmed" : "Pending",
      createdAt: new Date(),
      payment: {
        completed: false,
        mode:
          selectedPaymentMethod === "cash" ? selectedPaymentMethod : "stripe",
        details: null,
      },

      msgId: auth.currentUser?.uid
        ? doc(collection(db, "chats", auth.currentUser?.uid, "messages")).id
        : sessionStorage.getItem("guestLogin")
        ? null
        : "",
      userName: userData?.name || addressToDeliver?.name,
      region: "",
    };

    if (sessionStorage.getItem("guestLogin") && !auth.currentUser?.uid) {
      orderObj["guestLogin"] = true;
    }

    if (auth?.currentUser?.uid) {
      orderObj["userId"] = auth.currentUser?.uid;
    } else {
      orderObj["userId"] = null;
    }

    if (isCashBackUsed) {
      orderObj["cashbackAmount"] = cashBackUsed;
    }

    let orderId;
    setLoading(true);
    if (makeDefault) {
      await updateDefaultAddress({
        ...addressToDeliver,
        createdAt: new Date(),
      });
    }
    if (saveAddress) {
      await addAddressToUser({ ...addressToDeliver, createdAt: new Date() });
    }

    if (isCod) {
      orderId = (await addDoc(collection(db, "orders"), orderObj)).id;
      toast.success("Order Placed Successfully");
      setLoading(false);
      dispatch(reset());

      // try {
      //   if (selectedPaymentMethod === "cash") {
      //     if (getConditionForCashPaymentBackendFunction()) {
      //       const orderPaymentWithWallet = httpsCallable(
      //         functions,
      //         "wallet-orderPaymentWithWallet"
      //       );
      //       await orderPaymentWithWallet.call({
      //         ...orderObj,
      //         createdAt: "",
      //         orderDocId: orderId,
      //       });
      //     } else {
      //       const ac_paymentWithCash = httpsCallable(
      //         functions,
      //         "payments-ac_paymentWithCash"
      //       );
      //       await ac_paymentWithCash.call({
      //         ...orderObj,
      //         createdAt: "",
      //         orderDocId: orderId,
      //       });
      //     }
      //   }
      // } catch (error) {
      //   console.log("ERROR", error);
      // }
      router.push(`/payment-success/?orderId=${orderId}&mode=cash`);
      return orderId;
    } else {
      orderId = (await addDoc(collection(db, "tmpOrders"), orderObj)).id;
      setLoading(false);
      // return orderId;
      setShowPay({ ...showPay, orderId: orderId });

      onClientSecretSubmit(orderId);
    }
  }

  const ValidateAddress = () => {
    // if(addressToDeliver?.country)
    const {
      address,
      city,
      lat,
      lng,
      name,
      phoneNo,
      pincode,
      state,
      country,
      stateCode,
      email,
    } = addressToDeliver;
    console.log(addressToDeliver);
    if (!name) {
      return false;
    } else if (!email) {
      return false;
    } else if (!validateEmail(email)) {
      return false;
    } else if (phoneNo.length < 7 && phoneNo.length > 12) {
      return false;
    } else if (!country) {
      return false;
    } else if (!city) {
      return false;
    } else if (!address) {
      return false;
    }
    // else if (!pincode) {
    //   return false;
    // }
    return true;
  };

  return (
    <div className="px-body ">
      <CheckoutNav />
      <CheckoutProgress />
      <div className="w-full flex md:flex-row flex-col gap-4 sm:gap-8 md:gap-16  my-6 sm:my-8 md:my-10 ">
        <div className="w-full md:w-[55%]  flex flex-col ">
          <div className="flex justify-between items-center ">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-black ">
              Billing Details
            </h2>
          </div>
          <NewAddress
            setSaveAddress={setSaveAddress}
            setMakeDefault={setMakeDefault}
            userData={userData}
            setName={setName}
            userAddress={addressToDeliver}
            setUserAddress={setAddressToDeliver}
            makeDefaultAddress={makeDefaultAddress}
            setMakeDefaultAddress={setMakeDefaultAddress}
            isNewAddress={isNewAddress}
            setIsNewAddress={setIsNewAddress}
            handleAddressSubmit={handleAddressSubmit}
            handleChange={handleChange}
          />
        </div>
        <div className="w-full md:w-[45%]  flex flex-col gap-3 sm:gap-4 md:gap-5 ">
          <div className="flex justify-between items-center ">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-black ">
              Your order
            </h2>
          </div>
          <CheckoutOrders
            paymentSummary={paymentSummary}
            addressToDeliver={addressToDeliver}
          />
          <CouponSection
            updatePaymentSummaryWithOverLayLoading={
              updatePaymentSummaryWithOverLayLoading
            }
            setOverLayLoading={setOverLayLoading}
            isCouponApplied={isCouponApplied}
            setIsCouponApplied={setIsCouponApplied}
            setAppliedCouponAmount={setAppliedCouponAmount}
            paymentSummary={paymentSummary}
            setPaymentSummary={setPaymentSummary}
          />
          <SubtotalComponent
            cashbackUsed={cashBackUsed}
            isCashbackUsed={isCashBackUsed}
            setIsCashbackUsed={setIsCashbackUsed}
            overLayLoading={overLayLoading}
            paymentSummary={paymentSummary}
            isPaymentSummaryLoading={isPaymentSummaryLoading}
            userAddress={addressToDeliver}
            addressToDeliver={addressToDeliver}
            isCouponApplied={isCouponApplied}
            appliedCouponAmount={appliedCouponAmount}
          />
          {/* this is check out Box  */}
          {paymentSummary && addressToDeliver && currency ? (
            !ValidateAddress() ? (
              <div className=" p-5 rounded-md text-white bg-red-500">
                {" "}
                <p className="font-bold">
                  Please enter all the required fields to continue to payment.
                </p>
              </div>
            ) : (
              <MakeCheckout
                stripeData={{
                  amount: Math.round(
                    isCashBackUsed
                      ? (paymentSummary?.totalPayable - cashBackUsed) * currRate
                      : paymentSummary?.totalPayable * currRate
                  ),

                  currency: currency.toLowerCase(),

                  user: {
                    address: addressToDeliver,
                    name: addressToDeliver?.name,
                    phone: addressToDeliver?.phoneNo,
                    email: addressToDeliver?.email,
                  },
                }}
                state={addressToDeliver.state}
                userNote={userNote}
                checkIfThereIsAnyProductWhichIsNotDeliverableToSelectedCountry={
                  checkIfThereIsAnyProductWhichIsNotDeliverableToSelectedCountry
                }
                handleSubmit={(cod) => placeNewOrder(cod)}
                isTermsAgreed={isTermsAgreed}
                selectedPaymentMethod={selectedPaymentMethod}
                loading={loading}
                setLoading={setLoading}
                setIsTermsAgreed={setIsTermsAgreed}
                setUserNote={setUserNote}
                isCashBackUsed={isCashBackUsed}
                setSelectedPaymentMethod={setSelectedPaymentMethod}
              />
            )
          ) : null}
        </div>
      </div>
      {showPay.pay && showPay.secret != null ? (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret: showPay.secret,
            // mode: "payment",
            // loader: "auto",
            // capture_method: "automatic",
            // payment_method_types: ["card"],
            // amount:
            //   Math.round(
            //     isCashBackUsed
            //       ? (paymentSummary?.totalPayable - cashBackUsed) * currRate
            //       : paymentSummary?.totalPayable * currRate
            //   ) * 100,

            // currency: currency.toLowerCase(),
          }}
        >
          <PaymentBox
            showPay={showPay}
            paymentState={setShowPay}
            stripeData={{
              amount: Math.round(
                isCashBackUsed
                  ? (paymentSummary?.totalPayable - cashBackUsed) * currRate
                  : paymentSummary?.totalPayable * currRate
              ),

              currency: currency.toLowerCase(),
              user: {
                address: addressToDeliver,
                name: addressToDeliver?.name,
                phone: addressToDeliver?.phoneNo,
                email: addressToDeliver?.email,
              },
            }}
            state={addressToDeliver.state}
            userNote={userNote}
            checkIfThereIsAnyProductWhichIsNotDeliverableToSelectedCountry={
              checkIfThereIsAnyProductWhichIsNotDeliverableToSelectedCountry
            }
            handleSubmit={(cod) => placeNewOrder(cod)}
            isTermsAgreed={isTermsAgreed}
            selectedPaymentMethod={selectedPaymentMethod}
            loading={loading}
            setLoading={setLoading}
            setIsTermsAgreed={setIsTermsAgreed}
            setUserNote={setUserNote}
            isCashBackUsed={isCashBackUsed}
            setSelectedPaymentMethod={setSelectedPaymentMethod}
          />
        </Elements>
      ) : null}
    </div>
  );
}

export default CheckoutPage;

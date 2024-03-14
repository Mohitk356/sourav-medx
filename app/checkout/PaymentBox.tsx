import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { MakeCheckoutProps } from "../../components/checkout/stripe/MakeCheckout";
import { makeLeastSignificantDigitZero } from "../../utils/utilities";
import { PayState } from "./page";

interface IPaymentBox extends MakeCheckoutProps {
  paymentState: Function;
  showPay: PayState;
}

function PaymentBox({
  checkIfThereIsAnyProductWhichIsNotDeliverableToSelectedCountry,
  handleSubmit,
  isTermsAgreed,
  loading,
  selectedPaymentMethod,
  setIsTermsAgreed,
  setLoading,
  setUserNote,
  state,
  stripeData,
  userNote,
  isCashBackUsed,
  setSelectedPaymentMethod,
  paymentState,
  showPay,
}: IPaymentBox) {
  const stripe = useStripe();
  const elements = useElements();
  const [loadingPay, setLoadingPay] = useState<boolean>(false);
  const onClientSecretSubmit = async () => {
    if (showPay.secret != null) {
      return false;
    }
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
    paymentState({
      ...showPay,
      secret: clientSecret,
      pay: true,
      payment_intent: data.id,
    });
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

  useEffect(() => {
    onClientSecretSubmit();
  }, []);

  const confirmPayment = async () => {
    try {
      if (elements == null) {
        return;
      }

      // Trigger form validation and wallet collection
      const { error: submitError } = await elements.submit();
      if (submitError) {
        // Show error to your customer
        toast.error(submitError.message + " on submit");
        return;
      }

      if (
        showPay.orderId == null ||
        showPay.payment_intent == null ||
        showPay.secret == null
      ) {
        console.log(showPay);

        toast.error("Please Try Again Payment Not Detected!");
        paymentState({
          pay: false,
          secret: null,
          orderId: null,
          payment_intent: null,
        });
        setLoading(false);
        return;
      }
      setLoadingPay(true);
      const { error } = await stripe.confirmPayment({
        //`Elements` instance that was used to create the Payment Element
        elements,
        clientSecret: showPay.secret,
        confirmParams: {
          return_url:
            process.env.NEXT_PUBLIC_API_DOMAIN +
            `/api/stripe/${showPay.orderId}`,
        },
      });
      // /${id}/complete/${clientSecret}
      if (error) {
        setLoadingPay(false);

        toast.error("Payment Rejected");
        // router.push("/payment-failed");
        window.location.replace(
          process.env.NEXT_PUBLIC_API_DOMAIN +
            `/api/stripe/error/${showPay.orderId}?payment_intent=${showPay.payment_intent}`
        );
        console.log(error);
      } else {
        setLoadingPay(false);

        // Your customer will be redirected to your `return_url`. For some payment
        // methods like iDEAL, your customer will be redirected to an intermediate
        // site first to authorize the payment, then redirected to the `return_url`.\
        setLoading(false);
      }
    } catch (error) {
      setLoadingPay(false);
      console.log(error);
    }
  };

  return (
    <div className="bg-black/40 w-screen h-screen fixed top-0 right-0  z-20 flex justify-center md:items-center items-end overflow-auto">
      <div className="md:w-[550px] w-screen md:h-auto  bg-white md:rounded-3xl rounded-t-3xl p-10 ">
        <h1 className="font-bold text-xl  text-black mb-10">
          Enter Payment Info
        </h1>
        <PaymentElement
          options={{
            wallets: { applePay: "auto", googlePay: "auto" },
            fields: {
              billingDetails: "auto",
            },
            terms: {
              applePay: "always",
              googlePay: "always",
            },
          }}
        />
        <div>
          <button
            onClick={confirmPayment}
            disabled={loadingPay}
            className={`${
              !loadingPay ? "bg-red-500" : "bg-red-200"
            } p-3 rounded-lg w-full font-bold text-white mt-10`}
          >
            {loadingPay ? "Processing.." : "Continue Payment"}
          </button>

          <button
            onClick={() => {
              paymentState({
                pay: false,
                secret: null,
                orderId: null,
                payment_intent: null,
              });
              setLoading(false);
            }}
            className="bg-gray-200 p-3 rounded-lg w-full font-bold text-black mt-5 md:mb-0 mb-20"
          >
            Cancel Payment
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentBox;

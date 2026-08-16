export function CheckoutSteps({
  step,
}: {
  step: "checkout" | "confirmation";
}) {
  const checkoutDone = step === "confirmation";

  return (
    <div className="flex items-center justify-center pb-6 pt-8 lg:pb-8 lg:pt-10">
      {/* Cart — always done */}
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-espresso text-white">
          <i className="ph-duotone ph-check h-3.5 w-3.5" />
        </span>
        <span className="text-[13px] font-semibold text-espresso max-sm:hidden">
          Cart
        </span>
      </div>
      <span
        className={`mx-2 h-0.5 w-6 sm:mx-3 sm:w-10 ${
          checkoutDone ? "bg-espresso" : "bg-sand-deep"
        }`}
      />

      {/* Checkout */}
      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${
            checkoutDone ? "bg-espresso" : "bg-clay"
          }`}
        >
          {checkoutDone ? (
            <i className="ph-duotone ph-check h-3.5 w-3.5" />
          ) : (
            <span className="font-display text-xs font-bold">2</span>
          )}
        </span>
        <span
          className={`text-[13px] font-semibold max-sm:hidden ${
            checkoutDone ? "text-espresso" : "text-clay"
          }`}
        >
          Checkout
        </span>
      </div>
      <span className="mx-2 h-0.5 w-6 bg-sand-deep sm:mx-3 sm:w-10" />

      {/* Confirmation */}
      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full ${
            step === "confirmation"
              ? "bg-clay text-white"
              : "border-2 border-sand-deep font-display text-xs font-bold text-taupe"
          }`}
        >
          {step === "confirmation" ? (
            <i className="ph-duotone ph-check h-3.5 w-3.5" />
          ) : (
            "3"
          )}
        </span>
        <span
          className={`text-[13px] font-semibold max-sm:hidden ${
            step === "confirmation" ? "text-clay" : "text-taupe"
          }`}
        >
          Confirmation
        </span>
      </div>
    </div>
  );
}

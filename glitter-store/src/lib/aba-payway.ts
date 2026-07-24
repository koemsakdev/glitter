// ABA PayWay browser bridge helpers.
//
// ABA's checkout.prod.js (loaded in the root layout) defines `AbaPayway` as a
// top-level `const`, so it lives in the global lexical scope — NOT on `window`.
// Reference it as a bare global, guarded by `typeof` so it can't throw before
// the script has loaded.
declare const AbaPayway: { checkout: () => void } | undefined;

export function getAbaPayway(): { checkout: () => void } | undefined {
  return typeof AbaPayway === "undefined" ? undefined : AbaPayway;
}

/** Resolve once ABA's bridge is ready (script may still be loading), or false. */
export function waitForAba(timeoutMs = 8000): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (getAbaPayway()?.checkout) return resolve(true);
    let waited = 0;
    const step = 100;
    const t = setInterval(() => {
      if (getAbaPayway()?.checkout) {
        clearInterval(t);
        resolve(true);
      } else if ((waited += step) >= timeoutMs) {
        clearInterval(t);
        resolve(false);
      }
    }, step);
  });
}

/**
 * Build the signed hidden <form id="aba_merchant_request" target="aba_webservice">
 * and call `AbaPayway.checkout()`, which finds that form and opens ABA's own
 * checkout modal/iframe. Returns false if the bridge isn't available.
 */
export function openAbaCheckout(
  actionUrl: string,
  fields: Record<string, string>,
): boolean {
  const aba = getAbaPayway();
  if (!aba?.checkout) return false;

  document.getElementById("aba_merchant_request")?.remove();
  const form = document.createElement("form");
  form.id = "aba_merchant_request";
  form.method = "POST";
  form.action = actionUrl;
  form.target = "aba_webservice";
  form.style.display = "none";
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value ?? "";
    form.appendChild(input);
  }
  document.body.appendChild(form);
  aba.checkout();
  return true;
}

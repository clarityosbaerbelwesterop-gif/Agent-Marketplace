import { NextResponse } from "next/server";
import { createRentalCheckout } from "@/lib/runtime/rentals";
import { rentalCreateRedirectUrl } from "@/lib/runtime/unpaid-access";
import { parseCreateRentalBody } from "./create-rental-body";
import { jsonError, readJsonBody, requireApiUser } from "./guard";

export { parseCreateRentalBody } from "./create-rental-body";

export async function postCreateRentalCheckout(
  request: Request,
  options: { includeUrlAlias?: boolean } = {},
): Promise<NextResponse> {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  const parsed = parseCreateRentalBody(json.body);
  if (!parsed.ok) {
    return jsonError(parsed.error, parsed.status);
  }
  const result = await createRentalCheckout({
    userId: auth.userId,
    slug: parsed.slug,
    durationId: parsed.durationId,
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  const redirectUrl = rentalCreateRedirectUrl(result.data);
  const body = options.includeUrlAlias
    ? { ...result.data, checkoutUrl: result.data.checkoutUrl ?? null, url: redirectUrl }
    : { ...result.data, checkoutUrl: result.data.checkoutUrl ?? null };
  return NextResponse.json(body, { status: 201 });
}

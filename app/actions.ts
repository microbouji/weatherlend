"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  BookingError,
  cancelBooking,
  createBooking,
  createOffer,
  createRequest,
  quoteBooking,
} from "@/lib/loans";
import { saveOptionalPhoto } from "@/lib/photos";
import { getCurrentUserId, USER_COOKIE } from "@/lib/session";
import { REQUEST_STATUS } from "@/lib/domain";

export interface FormState {
  error?: string;
}

function errorState(error: unknown): FormState {
  return { error: error instanceof BookingError ? error.message : "Something went wrong." };
}

// ---------------------------------------------------------------------------
// Demo user
// ---------------------------------------------------------------------------

/** Demo-user switcher (tender: no authentication in this prototype). */
export async function switchUser(userId: number): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const store = await cookies();
  store.set(USER_COOKIE, String(user.id), { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Booking (hotel-style: quote first, then book)
// ---------------------------------------------------------------------------

/** Dry-run for the availability verdict. Called live from the offer page. */
export async function quoteForOffer(offerId: number, fromKey: string, toKey: string) {
  const borrowerId = await getCurrentUserId();
  return quoteBooking(offerId, borrowerId, fromKey, toKey);
}

export async function bookOffer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState | never> {
  const borrowerId = await getCurrentUserId();
  try {
    await createBooking({
      offerId: Number(formData.get("offerId")),
      borrowerId,
      fromKey: String(formData.get("from") ?? ""),
      toKey: String(formData.get("to") ?? ""),
    });
  } catch (error) {
    return errorState(error);
  }
  redirect("/dashboard?booked=1");
}

export async function cancelBookingAction(bookingId: number): Promise<never> {
  const actorId = await getCurrentUserId();
  try {
    await cancelBooking(bookingId, actorId);
  } catch (error) {
    const message = error instanceof BookingError ? error.message : "Something went wrong.";
    redirect(`/dashboard?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/dashboard");
  redirect("/dashboard?cancelled=1");
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export async function createOfferAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState | never> {
  const ownerId = await getCurrentUserId();
  try {
    const photoPath = await saveOptionalPhoto(formData.get("photo") as File | null);
    const phenomenonIds = formData.getAll("phenomena").map(Number);
    const offerId = await createOffer({
      ownerId,
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      sizeKey: String(formData.get("size") ?? ""),
      neighbourhood: String(formData.get("neighbourhood") ?? ""),
      availableFromKey: String(formData.get("availableFrom") ?? ""),
      availableUntilKey: String(formData.get("availableUntil") ?? ""),
      phenomenonIds,
      photoPath: photoPath ?? undefined,
    });

    // "I have this": the new offer immediately books the request's days.
    const sourceRequestId = Number(formData.get("sourceRequestId") ?? 0);
    if (sourceRequestId) {
      const request = await prisma.request.findUnique({ where: { id: sourceRequestId } });
      if (!request || request.status !== REQUEST_STATUS.OPEN) {
        throw new BookingError("The request you are answering is no longer open.");
      }
      const fromKey =
        request.periodFrom?.toISOString().slice(0, 10) ?? String(formData.get("bookFrom") ?? "");
      const toKey =
        request.periodUntil?.toISOString().slice(0, 10) ?? String(formData.get("bookTo") ?? "");
      await createBooking({
        offerId,
        borrowerId: request.requesterId,
        fromKey,
        toKey,
        sourceRequestId: request.id,
      });
    }
  } catch (error) {
    return errorState(error);
  }
  redirect("/dashboard?offered=1");
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export async function createRequestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState | never> {
  const requesterId = await getCurrentUserId();
  try {
    await createRequest({
      requesterId,
      title: String(formData.get("title") ?? ""),
      phenomenonId: Number(formData.get("phenomenon") ?? 0),
      neighbourhood: String(formData.get("neighbourhood") ?? ""),
      note: String(formData.get("note") ?? ""),
      periodNote: String(formData.get("periodNote") ?? ""),
      periodFromKey: String(formData.get("periodFrom") ?? "") || undefined,
      periodUntilKey: String(formData.get("periodUntil") ?? "") || undefined,
    });
  } catch (error) {
    return errorState(error);
  }
  redirect("/requests?posted=1");
}

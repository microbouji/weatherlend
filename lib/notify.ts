// Notification seam for the follow-up version.
//
// The prototype assumes every user has an email address (see User.email)
// but sends nothing: there is no mail infrastructure by design (tender:
// notifications are out of scope). These helpers log what WOULD be sent so
// the flows are already wired — the follow-up only replaces `deliver()`
// with a real mailer.
//
// TODO(follow-up): implement deliver() with a mail provider and store
// receipts in a Notification table.

export interface OutgoingMail {
  to: string;
  subject: string;
  body: string;
}

function deliver(mail: OutgoingMail): void {
  // TODO(follow-up): replace with real sending.
  console.log(`[weatherlend:mail] To: ${mail.to} | ${mail.subject}\n${mail.body}`);
}

export function notifyBookingCreated(opts: {
  lenderEmail: string;
  lenderName: string;
  borrowerName: string;
  offerTitle: string;
  rangeLabel: string;
  points: number;
}): void {
  deliver({
    to: opts.lenderEmail,
    subject: `Your ${opts.offerTitle} is booked (${opts.rangeLabel})`,
    body:
      `Hi ${opts.lenderName},\n\n` +
      `${opts.borrowerName} booked your "${opts.offerTitle}" for ${opts.rangeLabel}. ` +
      `You earn ${opts.points} points.\n\n— Weatherlend (prototype: this email was not sent)`,
  });
}

export function notifyBookingCancelled(opts: {
  otherPartyEmail: string;
  otherPartyName: string;
  cancelledByName: string;
  offerTitle: string;
  rangeLabel: string;
  pointsRefunded: number;
}): void {
  deliver({
    to: opts.otherPartyEmail,
    subject: `Booking cancelled: ${opts.offerTitle} (${opts.rangeLabel})`,
    body:
      `Hi ${opts.otherPartyName},\n\n` +
      `${opts.cancelledByName} cancelled the booking of "${opts.offerTitle}" for ${opts.rangeLabel}. ` +
      `${opts.pointsRefunded} points were returned.\n\n— Weatherlend (prototype: this email was not sent)`,
  });
}

export function notifyRequestFulfilled(opts: {
  requesterEmail: string;
  requesterName: string;
  lenderName: string;
  requestTitle: string;
  rangeLabel: string;
}): void {
  deliver({
    to: opts.requesterEmail,
    subject: `Someone has your "${opts.requestTitle}" (${opts.rangeLabel})`,
    body:
      `Hi ${opts.requesterName},\n\n` +
      `${opts.lenderName} offered the item you requested ("${opts.requestTitle}") for ${opts.rangeLabel}. ` +
      `Get in touch to arrange handover.\n\n— Weatherlend (prototype: this email was not sent)`,
  });
}

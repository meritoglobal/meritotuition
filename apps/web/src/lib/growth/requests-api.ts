import "server-only";
import type { Bid, TuitionRequest } from "./requests";

/** JSON shapes for the app: no emails, no phone numbers. */
export const pubRequest = ({ student_email: _s, chosen_bid, ...r }: TuitionRequest) => ({ ...r, chosenBid: chosen_bid });
export const pubBid = ({ teacher_email: _e, ...b }: Bid) => b;

/**
 * Money on the client. There is no separate implementation: the formatting and the integer arithmetic come
 * from `@aib/shared`, the same module the API uses, so a total can never differ between the two.
 */

export {
  addKobo,
  discountPercent,
  formatNaira,
  formatNairaPlain,
  koboToNaira,
  multiplyKobo,
  parseNairaToKobo,
  subtractKobo,
  type Kobo,
  type KoboInput,
} from "@aib/shared";

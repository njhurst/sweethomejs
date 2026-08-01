import { formatFloat } from "@sweethomejs/core";

/**
 * Placeholder CLI. Will host: .sh3d conversion, home field-dumps for parity
 * tests, offscreen renders, fixture management (tasks 1.4–1.6).
 */
function main(): void {
  console.log(`sweethomejs cli (scaffold) — formatFloat(0.1) = ${formatFloat(0.1)}`);
}

main();

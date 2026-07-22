import { validateTransition, VALID_TRANSITIONS } from "./orderStateMachine";
import ApiError from "../error/ApiError";

describe("orderStateMachine", () => {
  describe("validateTransition", () => {
    it("allows a payment to activate a direct (non-property) order", () => {
      expect(() => validateTransition("pending_payment", "pending")).not.toThrow();
    });

    it("allows a payment to activate a property order", () => {
      expect(() =>
        validateTransition("pending_payment", "pending_host_approval"),
      ).not.toThrow();
    });

    it("walks the full direct-order lifecycle", () => {
      const path = [
        "pending_payment",
        "pending",
        "accepted_by_merchant",
        "preparing",
        "ready_for_pickup",
        "driver_assigned",
        "picked_up",
        "out_for_delivery",
        "delivered",
      ];
      for (let i = 0; i < path.length - 1; i++) {
        expect(() => validateTransition(path[i], path[i + 1])).not.toThrow();
      }
    });

    it("rejects skipping a step (e.g. pending straight to delivered)", () => {
      expect(() => validateTransition("pending", "delivered")).toThrow(ApiError);
    });

    it("rejects transitioning out of a terminal state", () => {
      expect(() => validateTransition("delivered", "cancelled")).toThrow(ApiError);
    });

    it("rejects an unknown status entirely", () => {
      expect(() => validateTransition("not_a_real_status", "pending")).toThrow(
        ApiError,
      );
    });

    it("allows cancellation from every cancellable state", () => {
      const cancellable = [
        "pending_payment",
        "pending",
        "pending_host_approval",
        "approved",
        "accepted_by_merchant",
        "preparing",
        "ready_for_pickup",
        "driver_assigned",
      ];
      for (const state of cancellable) {
        expect(() => validateTransition(state, "cancelled")).not.toThrow();
      }
    });

    it("does not allow cancelling once picked up (in the customer's hands)", () => {
      expect(() => validateTransition("picked_up", "cancelled")).toThrow(ApiError);
      expect(() => validateTransition("out_for_delivery", "cancelled")).toThrow(
        ApiError,
      );
    });
  });

  describe("VALID_TRANSITIONS", () => {
    it("has no transition target that isn't itself a known state (except cancelled/delivered as terminals)", () => {
      const knownStates = new Set(Object.keys(VALID_TRANSITIONS));
      knownStates.add("cancelled");
      knownStates.add("delivered");

      for (const targets of Object.values(VALID_TRANSITIONS)) {
        for (const target of targets) {
          expect(knownStates.has(target)).toBe(true);
        }
      }
    });
  });
});

import { PaymentService } from "./payment.service";

describe("PaymentService.earningsFieldsFor", () => {
  it("uses merchantId/merchantNetEarnings for MERCHANT", () => {
    expect(PaymentService.earningsFieldsFor("MERCHANT")).toEqual({
      ownerField: "merchantId",
      payoutField: "merchantNetEarnings",
    });
  });

  it("uses propertyHostId/propertyHostPayout for PROPERTY_HOST", () => {
    expect(PaymentService.earningsFieldsFor("PROPERTY_HOST")).toEqual({
      ownerField: "propertyHostId",
      payoutField: "propertyHostPayout",
    });
  });

  it("defaults to driverId/driverPayout for DRIVER (and any other role)", () => {
    expect(PaymentService.earningsFieldsFor("DRIVER")).toEqual({
      ownerField: "driverId",
      payoutField: "driverPayout",
    });
    expect(PaymentService.earningsFieldsFor("USER")).toEqual({
      ownerField: "driverId",
      payoutField: "driverPayout",
    });
  });
});

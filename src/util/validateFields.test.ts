import validateFields from "./validateFields";
import ApiError from "../error/ApiError";

describe("validateFields", () => {
  it("passes when every required field is present and truthy", () => {
    expect(() =>
      validateFields({ email: "a@b.com", password: "x" }, ["email", "password"]),
    ).not.toThrow();
  });

  it("throws when the payload itself is missing", () => {
    expect(() => validateFields(undefined, ["email"])).toThrow(ApiError);
    expect(() => validateFields(null, ["email"])).toThrow(ApiError);
  });

  it("throws naming the specific missing field", () => {
    expect(() => validateFields({ email: "a@b.com" }, ["email", "password"])).toThrow(
      "password is required",
    );
  });

  it("treats falsy-but-present values (0, '', false) as missing", () => {
    expect(() => validateFields({ quantity: 0 }, ["quantity"])).toThrow(ApiError);
    expect(() => validateFields({ name: "" }, ["name"])).toThrow(ApiError);
  });

  it("requires nothing when the required-fields list is empty", () => {
    expect(() => validateFields({}, [])).not.toThrow();
  });
});

import ProductService from "./product.service";
import { Product } from "./Product";

/**
 * Unit tests for ProductService — mocks the Mongoose model methods so these
 * are pure unit tests that don't require a live database connection.
 */
describe("ProductService", () => {
  const originalCreate = Product.create;
  const originalFindOne = Product.findOne;
  const originalFindById = Product.findById;
  const originalFindByIdAndUpdate = Product.findByIdAndUpdate;
  const originalDeleteOne = Product.deleteOne;

  afterEach(() => {
    Product.create = originalCreate;
    Product.findOne = originalFindOne;
    Product.findById = originalFindById;
    Product.findByIdAndUpdate = originalFindByIdAndUpdate;
    Product.deleteOne = originalDeleteOne;
  });

  it("createProduct assigns the authenticated merchant and uploaded image path", async () => {
    let createDataReceived: any = null;
    Product.create = (async (data: any) => {
      createDataReceived = data;
      return { ...data, _id: "mocked-product-id" };
    }) as any;

    const mockCreateReq = {
      user: { userId: "merchant-123" },
      body: {
        name: "Test Product",
        category: "Food",
        price: 10,
        quantity: 5,
        description: "Test description",
      },
      files: { product_image: [{ path: "uploads/test.jpg" }] },
    } as any;

    const createdProduct = await ProductService.createProduct(mockCreateReq);

    expect(createdProduct._id).toBe("mocked-product-id");
    expect(createDataReceived.merchant).toBe("merchant-123");
    expect(createDataReceived.product_image).toBe("uploads/test.jpg");
    expect(createDataReceived.name).toBe("Test Product");
  });

  it("getProduct returns the product by id, and 404s when not found", async () => {
    Product.findOne = ((query: any) => ({
      lean: async () =>
        query._id === "mocked-product-id"
          ? { _id: "mocked-product-id", name: "Test Product" }
          : null,
    })) as any;

    const fetched = await ProductService.getProduct(
      {},
      { productId: "mocked-product-id" },
    );
    expect(fetched._id).toBe("mocked-product-id");

    await expect(
      ProductService.getProduct({}, { productId: "invalid-id" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("updateProduct applies changes for the owning merchant, rejects others", async () => {
    Product.findById = (async (id: any) =>
      id === "mocked-product-id"
        ? {
            _id: "mocked-product-id",
            merchant: "merchant-123",
            toString: () => "mocked-product-id",
          }
        : null) as any;

    let updateIdReceived: any = null;
    let updateDataReceived: any = null;
    Product.findByIdAndUpdate = (async (id: any, data: any) => {
      updateIdReceived = id;
      updateDataReceived = data;
      return { _id: id, ...data };
    }) as any;

    const updated = await ProductService.updateProduct({
      user: { userId: "merchant-123" },
      body: { productId: "mocked-product-id", price: 20 },
      files: {},
    } as any);

    expect(updateIdReceived).toBe("mocked-product-id");
    expect(updateDataReceived.price).toBe(20);
    expect(updated.price).toBe(20);

    await expect(
      ProductService.updateProduct({
        user: { userId: "wrong-merchant" },
        body: { productId: "mocked-product-id", price: 20 },
        files: {},
      } as any),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("deleteProduct removes the product by id", async () => {
    let deleteIdReceived: any = null;
    Product.findById = (async (id: any) => ({
      _id: id,
      merchant: "merchant-123",
      toString: () => id,
      product_image: undefined,
    })) as any;
    Product.deleteOne = (async (query: any) => {
      deleteIdReceived = query._id;
      return { acknowledged: true, deletedCount: 1 };
    }) as any;

    const result = await ProductService.deleteProduct(
      { userId: "merchant-123" },
      { productId: "mocked-product-id" },
    );

    expect(deleteIdReceived).toBe("mocked-product-id");
    expect(result.deletedCount).toBe(1);
  });
});

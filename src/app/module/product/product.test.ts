import assert from "assert";
import ProductService from "./product.service";
import { Product } from "./Product";

/**
 * Unit tests for ProductService using Node's native assert.
 * We are mocking the Mongoose model methods to ensure these are pure unit tests
 * that do not require a live database connection.
 */

// We will save original methods to restore them later.
const originalCreate = Product.create;
const originalFindOne = Product.findOne;
const originalFindById = Product.findById;
const originalFindByIdAndUpdate = Product.findByIdAndUpdate;
const originalDeleteOne = Product.deleteOne;

async function runTests() {
  console.log("Starting unit tests for Product Module...\n");

  try {
    // ------------------------------------------------------------------------
    // Test 1: createProduct
    // ------------------------------------------------------------------------
    console.log("Running: testCreateProduct");
    let createDataReceived: any = null;
    
    // Mock Product.create
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
        description: "Test description"
      },
      files: {
        product_image: [{ path: "uploads/test.jpg" }]
      }
    } as any;

    const createdProduct = await ProductService.createProduct(mockCreateReq);
    
    assert.ok(createdProduct, "Product should be returned");
    assert.strictEqual(createdProduct._id, "mocked-product-id");
    assert.strictEqual(createDataReceived.merchant, "merchant-123", "Merchant ID should be assigned");
    assert.strictEqual(createDataReceived.product_image, "uploads/test.jpg", "Image path should be assigned");
    assert.strictEqual(createDataReceived.name, "Test Product");
    console.log("✅ testCreateProduct passed\n");


    // ------------------------------------------------------------------------
    // Test 2: getProduct
    // ------------------------------------------------------------------------
    console.log("Running: testGetProduct");
    let findOneQuery: any = null;

    // Mock Product.findOne
    Product.findOne = ((query: any) => {
      findOneQuery = query;
      return {
        lean: async () => {
          if (query._id === "mocked-product-id") {
            return { _id: "mocked-product-id", name: "Test Product" };
          }
          return null;
        }
      };
    }) as any;

    const mockGetQuery = { productId: "mocked-product-id" };
    const fetchedProduct = await ProductService.getProduct({}, mockGetQuery);

    assert.ok(fetchedProduct, "Product should be retrieved");
    assert.strictEqual(fetchedProduct._id, "mocked-product-id");
    assert.strictEqual(findOneQuery._id, "mocked-product-id", "Should query by correct productId");
    
    // Test Not Found Scenario
    try {
      await ProductService.getProduct({}, { productId: "invalid-id" });
      assert.fail("Should have thrown an ApiError for not found");
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 404, "Should throw 404 Not Found status");
    }
    console.log("✅ testGetProduct passed\n");


    // ------------------------------------------------------------------------
    // Test 3: updateProduct
    // ------------------------------------------------------------------------
    console.log("Running: testUpdateProduct");
    let updateIdReceived: any = null;
    let updateDataReceived: any = null;

    // Mock Product.findById
    Product.findById = (async (id: any) => {
      if (id === "mocked-product-id") {
        return {
          _id: "mocked-product-id",
          merchant: "merchant-123", // String or ObjectId-like that provides toString()
          toString: () => "mocked-product-id"
        };
      }
      return null;
    }) as any;

    // Mock Product.findByIdAndUpdate
    Product.findByIdAndUpdate = (async (id: any, data: any) => {
      updateIdReceived = id;
      updateDataReceived = data;
      return { _id: id, ...data };
    }) as any;

    const mockUpdateReq = {
      user: { userId: "merchant-123" },
      body: {
        productId: "mocked-product-id",
        price: 20
      },
      files: {} // No new image
    } as any;

    const updatedProduct = await ProductService.updateProduct(mockUpdateReq);
    
    assert.strictEqual(updateIdReceived, "mocked-product-id");
    assert.strictEqual(updateDataReceived.price, 20);
    assert.strictEqual(updatedProduct.price, 20);

    // Test Unauthorized Scenario
    const mockUpdateReqUnauthorized = {
      user: { userId: "wrong-merchant" },
      body: { productId: "mocked-product-id", price: 20 },
      files: {}
    } as any;

    try {
      await ProductService.updateProduct(mockUpdateReqUnauthorized);
      assert.fail("Should have thrown an ApiError for unauthorized");
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 401, "Should throw 401 Unauthorized");
    }
    console.log("✅ testUpdateProduct passed\n");


    // ------------------------------------------------------------------------
    // Test 4: deleteProduct
    // ------------------------------------------------------------------------
    console.log("Running: testDeleteProduct");
    let deleteIdReceived: any = null;

    // Mock Product.deleteOne
    Product.deleteOne = (async (query: any) => {
      deleteIdReceived = query._id;
      return { acknowledged: true, deletedCount: 1 };
    }) as any;

    const mockDeletePayload = { productId: "mocked-product-id" };
    const mockUserData = { userId: "merchant-123" };

    const deleteResult = await ProductService.deleteProduct(mockUserData, mockDeletePayload);

    assert.strictEqual(deleteIdReceived, "mocked-product-id");
    assert.strictEqual(deleteResult.deletedCount, 1);
    console.log("✅ testDeleteProduct passed\n");

    console.log("🎉 All Unit Tests Passed Successfully!");
  } catch (error) {
    console.error("❌ Test Failed:");
    console.error(error);
  } finally {
    // Restore original Mongoose methods to keep global state clean
    Product.create = originalCreate;
    Product.findOne = originalFindOne;
    Product.findById = originalFindById;
    Product.findByIdAndUpdate = originalFindByIdAndUpdate;
    Product.deleteOne = originalDeleteOne;
  }
}

// Execute the tests if this script is run directly
if (require.main === module) {
  runTests();
}

export { runTests };

const { status } = require("http-status");
import { Product } from "./Product";
import QueryBuilder from "../../../builder/queryBuilder";
import ApiError from "../../../error/ApiError";
import validateFields from "../../../util/validateFields";
import { Request } from "express";
import unlinkFile from "../../../util/unlinkFile";

const createProduct = async (req: Request) => {
  const { body: data, user } = req;
  const { userId } = user;
  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  validateFields(data, [
    "name",
    "category",
    "price",
    "quantity",
    "description",
  ]);

  if (!files || !files.product_image) {
    throw new ApiError(status.BAD_REQUEST, "Product image is required");
  }

  const productData = {
    ...data,
    merchant: userId,
    product_image: files.product_image[0].path,
  };

  const product = await Product.create(productData);
  return product;
};

const getProduct = async (userData: any, query: any) => {
  validateFields(query, ["productId"]);

  const product = await Product.findOne({
    _id: query.productId,
  }).lean();

  if (!product) {
    throw new ApiError(status.NOT_FOUND, "Product not found");
  }

  return product;
};

const getAllProducts = async (userData: any, query: any) => {
  const productQuery = new QueryBuilder(Product.find({}).lean(), query)
    .search(["name", "category", "description"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [products, meta] = await Promise.all([
    productQuery.modelQuery,
    productQuery.countTotal(),
  ]);

  return {
    meta,
    products,
  };
};

const updateProduct = async (req: Request) => {
  const { body: data, user } = req;
  const { userId } = user;
  const { productId, ...updateFields } = data;

  validateFields(data, ["productId"]);

  const existingProduct = await Product.findById(productId);
  if (!existingProduct) {
    throw new ApiError(status.NOT_FOUND, "Product not found");
  }

  if (existingProduct.merchant.toString() !== userId) {
    throw new ApiError(
      status.UNAUTHORIZED,
      "You are not authorized to update this product",
    );
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const updatedData: Record<string, any> = { ...updateFields };

  let replaceProductImage = false;
  if (files && files.product_image) {
    updatedData.product_image = files.product_image[0].path;
    replaceProductImage = true;
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    updatedData,
    {
      new: true,
      runValidators: true,
    },
  );

  if (replaceProductImage && existingProduct.product_image) {
    unlinkFile(existingProduct.product_image);
  }

  return updatedProduct;
};

const deleteProduct = async (userData: any, payload: any) => {
  validateFields(payload, ["productId"]);
  const { userId } = userData;

  const existingProduct = await Product.findById(payload.productId);
  if (!existingProduct) {
    throw new ApiError(status.NOT_FOUND, "Product not found");
  }

  if (existingProduct.merchant.toString() !== userId) {
    throw new ApiError(
      status.UNAUTHORIZED,
      "You are not authorized to delete this product",
    );
  }

  if (existingProduct.product_image) {
    unlinkFile(existingProduct.product_image);
  }

  const result = await Product.deleteOne({
    _id: payload.productId,
  });

  return result;
};

const ProductService = {
  createProduct,
  getProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
};

export default ProductService;

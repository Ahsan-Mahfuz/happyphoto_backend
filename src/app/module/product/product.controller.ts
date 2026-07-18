import { Request, Response } from "express";
import ProductService from "./product.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.createProduct(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product created",
    data: result,
  });
});

const getProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getProduct(req.user, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product retrieved",
    data: result,
  });
});

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getAllProducts(req.user, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Products retrieved",
    data: result,
  });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.updateProduct(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product updated",
    data: result,
  });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.deleteProduct(req.user, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product deleted",
    data: result,
  });
});

const ProductController = {
  createProduct,
  getProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
};

export default ProductController;

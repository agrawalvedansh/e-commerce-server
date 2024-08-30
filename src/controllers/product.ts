import { Request } from "express";
import { AsyncErrorHandler } from "../middlewares/error.js";
import { BaseQuery, NewProductRequestBody, SearchRequestQuery } from "../types/types.js";
import { Product } from "../models/product.js";
import CustomError from "../utils/utility-class.js";
import { rm } from "fs";
import { myCache } from "../app.js";
import { invalidatesCache } from "../utils/features.js";

export const newProduct = AsyncErrorHandler(async (req: Request<{}, {}, NewProductRequestBody>, res, next) => {

    const {name, price, stock, category} = req.body;
    const photo = req.file;

    if(!photo)return next(new CustomError("Please add photo", 400));

    if(!name || !price || !stock || !category){
        rm(photo.path, () => {
            console.log("Photo deleted");
        })
        return next(new CustomError("Please enter all fields!", 400));
    }

    await Product.create({
        name, price, stock, category: category.toLowerCase(), photo: photo?.path,
    })

    invalidatesCache({product: true, admin: true});
    return res.status(201).json({
        success: true,
        message: "Product Created Successfully",
    })
})

export const getlatestProducts = AsyncErrorHandler(async (req, res, next) => {
    let products = [];
    //Need to revalidate cache when New, Update, Delete, New Order
    if(myCache.has("latest-product")) 
        products = JSON.parse(myCache.get("latest-product") as string);
    else { 
        products = await Product.find({}).sort({createdAt: -1}).limit(5);
        myCache.set("latest-product", JSON.stringify(products));
    }

    return res.status(200).json({
        success: true,
        products,
    })
})

export const getAllCategories = AsyncErrorHandler(async (req, res, next) => {
    let categories;
    //Need to revalidate cache when New, Update, Delete, New Order
    if(myCache.has("categories"))
            categories = JSON.parse(myCache.get("categories") as string);
        else{
            categories = await Product.distinct("category");
            myCache.set("categories", JSON.stringify(categories));
        }

    return res.status(200).json({
        success: true,
        categories,
    })
})

export const getAdminProducts = AsyncErrorHandler(async (req, res, next) => {
    let products;
    //Need to revalidate cache when New, Update, Delete, New Order
    if(myCache.has("all-products"))
        products = JSON.parse(myCache.get("all-products") as string)
    else
    {
        products = await Product.find({});
        myCache.set("all-products", JSON.stringify(products));
    }

    if(!products) return next(new CustomError("Invalid Product Id", 404))
    return res.status(200).json({
        success: true,
        products,
    })
})

export const getSingleProduct = AsyncErrorHandler(async (req, res, next) => {
    let product;
    const id = req.params.id;
    //Need to revalidate cache when New, Update, Delete, New Order
    if(myCache.has(`product-${id}`))
        product = JSON.parse(myCache.get(`product-${id}`) as string);
    else
    {
        product = await Product.findById(id);
        myCache.set(`product-${id}`, JSON.stringify(product))
    }
    
    if(!product) return next(new CustomError("Invalid Product Id", 404))
    return res.status(200).json({
        success: true,
        product,
    })
})

export const updateProduct = AsyncErrorHandler(async (req, res, next) => {

    const {id} = req.params;
    const {name, price, stock, category} = req.body;
    const photo = req.file;
    const product = await Product.findById(id);

    if(!product) return next(new CustomError("Invalid Product Id", 404))
    if(photo) {
        rm(product.photo, () => {
            console.log("Old photo deleted!");
        })
        product.photo = photo.path;
    }

    if(name) product.name = name;
    if(stock) product.stock = stock;
    if(category) product.category = category;
    if(price) product.price = price;

    await product.save();
    invalidatesCache({product: true, productId: String(product._id), admin: true});

    return res.status(200).json({
        success: true,
        message: "Product Udpated Successfully",
    })
})

export const deleteProduct = AsyncErrorHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);
    if(!product) return next(new CustomError("Invalid Product Id", 404))

    rm(product.photo, () => {
        console.log("Product photo deleted!");
    })

    await product.deleteOne();
    invalidatesCache({product: true, productId: String(product._id), admin: true});

    return res.status(200).json({
        success: true,
        message: "Product deleted Successfully",
    })
})

export const getAllProducts = AsyncErrorHandler(async (req: Request<{}, {}, {}, SearchRequestQuery>, res, next) => {
    const {search, sort, category, price} = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(process.env.PRODUCT_PER_PAGE) || 6;
    const skip = limit*(page-1);

    const baseQuery: BaseQuery = {}

    if(search) baseQuery["name"] = {
        $regex: search,
        $options: 'i',
    }

    if(price) baseQuery.price = {
        $lte: Number(price)
    }

    if(category) baseQuery.category = category
    
    const productsPromise = Product.find(baseQuery)
      .sort(sort && { price: sort === "asc" ? 1 : -1 })
      .limit(limit)
      .skip(skip);

    const [products, filteredOnlyProduct] = await Promise.all([
      productsPromise,
      Product.find(baseQuery),
    ]);

    const totalPage = Math.ceil(filteredOnlyProduct.length / limit);

    return res.status(200).json({
        success: true,
        products,
        totalPage,
    })
})
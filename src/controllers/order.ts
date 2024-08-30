import { Request } from "express";
import { AsyncErrorHandler } from "../middlewares/error.js";
import { NewOrderRequestBody } from "../types/types.js";
import { Order } from "../models/order.js";
import { invalidatesCache, reduceStock } from "../utils/features.js";
import CustomError from "../utils/utility-class.js";
import { myCache } from "../app.js";

export const myOrders = AsyncErrorHandler(async (req, res, next) => {

    const { id:user } = req.query;
    const key = `my-orders-${user}`;
    let orders = [];

    if(myCache.has(key)) orders = JSON.parse(myCache.get(key) as string);
    else {
        orders = await Order.find({user});
        myCache.set(key, JSON.stringify(orders));
    }

    return res.status(200).json({
        success: true,
        orders,
    })
})

export const allOrders = AsyncErrorHandler(async (req:Request<{}, {}, NewOrderRequestBody>, res, next) => {

    let orders = []
    const key = 'all-orders';
    
    if(myCache.has(key)) orders = JSON.parse(myCache.get(key) as string);
    else {
        orders = await Order.find({}).populate("user", "name");
        myCache.set(key, JSON.stringify(orders));
    }

    return res.status(200).json({
        success: true,
        orders,
    })
})


export const getSingleOrder = AsyncErrorHandler(async (req, res, next) => {

    const {id} = req.params
    const key = `order-${id}`;
    let order;

    if(myCache.has(key)) order = JSON.parse(myCache.get(key) as string);
    else {
        order = await Order.findById(id).populate("user", "name");
        if(!order) next(new CustomError("Order not Found!", 404));
        myCache.set(key, JSON.stringify(order));
    }

    return res.status(200).json({
        success: true,
        order,
    })
})


export const newOrder = AsyncErrorHandler(async (req:Request<{}, {}, NewOrderRequestBody>, res, next) => {

    const {shippingInfo, orderItems, user, subtotal, tax, shippingCharges, discount, total} = req.body;

    await Order.create({
        shippingInfo, 
        orderItems, 
        user, 
        subtotal, 
        tax, 
        shippingCharges, 
        discount, 
        total
    });

    if(!shippingInfo || !orderItems || !user || !subtotal || !tax || !total)
        return next(new CustomError("Please enter all fields!", 400));

    await reduceStock(orderItems);
    invalidatesCache({product: true, order: true, admin: true, userId: user, productId: orderItems.map(i => i.productId)});

    return res.status(201).json({
        success: true,
        message: 'Order Placed Successfully!'
    })
})

export const processOrder = AsyncErrorHandler(async (req, res, next) => {

    const {id} = req.params;
    const order = await Order.findById(id);
 
    if(!order) return next(new CustomError("Order not found!", 404));

    switch (order.status) {
        case "Processing":
            order.status = "Shipped";       
            break;
        case "Shipped":
            order.status = "Delivered";       
            break;
        default:
            order.status = "Delivered";
            break;
    }

    await order.save();
    invalidatesCache({product: false, order: true, admin: true, userId: order.user, orderId: String(order._id)});

    return res.status(201).json({
        success: true,
        message: 'Order Processed Successfully!'
    })
})


export const deleteOrder = AsyncErrorHandler(async (req, res, next) => {

    const {id} = req.params;
    const order = await Order.findById(id);
 
    if(!order) return next(new CustomError("Order not found!", 404));

    await order.deleteOne();

    invalidatesCache({product: false, order: true, admin: true, userId: order.user, orderId: String(order._id)});

    return res.status(201).json({
        success: true,
        message: 'Order Deleted Successfully!'
    })
})
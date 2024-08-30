import { instance, razorKeySecret } from "../app.js";
import { AsyncErrorHandler } from "../middlewares/error.js";
import { Coupon } from "../models/coupon.js";
import crypto from "crypto"
import CustomError from "../utils/utility-class.js";
import { Order } from "../models/order.js";

export const checkout = AsyncErrorHandler(async (req, res, next) => {
    const { amount } = req.body;

    if (!amount)
        return next(new CustomError("Please enter amount", 400));

    const options = {
        amount: Number(amount * 100),
        currency: "INR",
    }

    const order = await instance.orders.create(options)
    return res.status(201).json({
        success: true,
        order
    })
})

export const verification = AsyncErrorHandler(async (req, res) => {
    const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature
    } = req.body;

    const secret = razorKeySecret;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const generated_signature = crypto.createHmac('sha256', secret).update(body.toString()).digest('hex');

    const isAuthentic = razorpay_signature === generated_signature;
    
    if (isAuthentic) {
        let orderData
        (typeof(req.query.orderData) === "string") && ( orderData = JSON.parse(decodeURIComponent(req.query.orderData)))
        await Order.create(orderData);
        console.log(orderData)
        return res.redirect("http://localhost:5173/orders")
    }
    else {
        return res.status(400).json({
            success: false,
        })
    }
 })


export const newCoupon = AsyncErrorHandler(async (req, res, next) => {
    const { coupon, amount } = req.body;

    if (!coupon || !amount)
        return next(new CustomError("Please enter both coupon and amount", 400));

    await Coupon.create({ code: coupon, amount });

    return res.status(201).json({
        success: true,
        message: "Coupon created Successfully!"
    })
})


export const allCoupons = AsyncErrorHandler(async (req, res, next) => {

    const coupons = await Coupon.find({});

    return res.status(201).json({
        success: true,
        coupons,
    })
})

export const deleteCoupon = AsyncErrorHandler(async (req, res, next) => {

    const id = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon)
        return next(new CustomError("Invalid Coupon ID!", 400));

    return res.status(201).json({
        success: true,
        message: "Coupon Deleted Successfully!"
    })
})


export const applyDiscount = AsyncErrorHandler(async (req, res, next) => {
    const { coupon } = req.query;

    const discount = await Coupon.findOne({ code: coupon })
    if (!discount)
        return next(new CustomError("Invalid Coupon!", 400));

    return res.status(201).json({
        success: true,
        discount: discount.amount
    })
})
import express from 'express'
import { adminOnly } from '../middlewares/auth.js';
import { allCoupons, applyDiscount, checkout, deleteCoupon, newCoupon, verification } from '../controllers/payment.js';

const app = express.Router();

// api/v1/payment/create
app.post("/create", checkout);

// api/v1/payment/verification
app.post("/verification", verification);

// api/v1/payment/discount
app.get("/discount", applyDiscount);

// api/v1/payment/coupon/new
app.post("/coupon/new", adminOnly, newCoupon);

// api/v1/payment/coupon/all
app.get("/coupon/all", adminOnly, allCoupons);

// api/v1/payment/coupon/delete
app.delete("/coupon/:id", adminOnly, deleteCoupon);

export default app;
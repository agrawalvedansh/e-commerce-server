import express from 'express'
import NodeCache from 'node-cache';
import {config} from "dotenv"
import morgan from 'morgan'
import Razorpay from 'razorpay';
import cors from 'cors'

//Importing Routes
import userRoute from './routes/user.js'
import productRoute from './routes/product.js'
import orderRoute from './routes/order.js'
import paymentRoute from './routes/payment.js'
import dashboardRoute from './routes/stats.js'

config({
    path: "./.env",
});


import { connectDB } from './utils/features.js';
import { GlobalErrorMiddleware } from './middlewares/error.js';

const mongoURI  = process.env.MONGO_URI || "";
const razorKeyId = process.env.RAZOR_KEY_ID || "";
export const razorKeySecret = process.env.RAZOR_KEY_SECRET || "";

export const instance = new Razorpay({
    key_id: razorKeyId,
    key_secret: razorKeySecret
})
export const myCache = new NodeCache();
const port = process.env.PORT || 3000;
connectDB(mongoURI);
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cors());
app.get("/", (req, res) => {
    res.send("API working");
})

//Using Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/product", productRoute);
app.use("/api/v1/order", orderRoute);
app.use("/api/v1/payment", paymentRoute);
app.use("/api/v1/dashboard", dashboardRoute);

app.use("/uploads", express.static("uploads"))
app.use(GlobalErrorMiddleware)

app.listen(port, () => {
    console.log(`Server is working on port ${port}`);
})
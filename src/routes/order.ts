import express from 'express'
import { adminOnly } from '../middlewares/auth.js';
import { allOrders, deleteOrder, getSingleOrder, myOrders, newOrder, processOrder } from '../controllers/order.js';

const app = express.Router();
 
//api/v1/order/new
app.post("/new", newOrder);

//api/v1/order/my
app.get("/my", myOrders);

//api/v1/order/all
app.get("/all", adminOnly, allOrders);

//api/v1/order/:id
app.route("/:id").get(getSingleOrder).put(adminOnly, processOrder).delete(adminOnly, deleteOrder);

export default app;
import mongoose, { Document } from "mongoose"
import { InvalidateCacheProps, OrderItemType } from "../types/types.js";
import { myCache } from "../app.js";
import { Product } from "../models/product.js";
import { Order } from "../models/order.js";

export const connectDB = (uri: string) => {
    mongoose.connect(uri, {
        dbName: "ECommerceApp",
    }).then((c) => {
        console.log(`DB connected to ${c.connection.host}`)
    })
        .catch((e) => console.log(e));
};

export const invalidatesCache = ({ product, order, admin, userId, orderId, productId }: InvalidateCacheProps) => {
    if (product) {
        const productKeys: string[] = ["latest-product", "categories", "all-products"];
        if (typeof (productId) == "string")
            productKeys.push(`product-${productId}`)
        else if (typeof (productId) == "object")
            productId.forEach(i => productKeys.push(`product-${i}`))

        myCache.del(productKeys);
    }
    if (order) {
        const orderKeys: string[] = ["all-orders", `my-orders-${userId}`, `order-${orderId}`];
        myCache.del(orderKeys);
    }
    if(admin) {
        myCache.del(['admins-stats', "admin-pie-chart", "admin-bar-charts", "admin-line-charts"])
    }
};

export const reduceStock = async (orderItems: OrderItemType[]) => {
    for (let i = 0; i < orderItems.length; i++) {
        const order = orderItems[i];
        const product = await Product.findById(order.productId);
        if (!product) throw new Error('Product not found');
        product.stock -= order.quantity;
        await product.save();
    }
}

export const calculatePercentage = (thisMonth: number, lastMonth: number) => {
    if (lastMonth == 0) return thisMonth * 100;
    const percent = (thisMonth / lastMonth) * 100;
    return Number(percent.toFixed(0));
}


interface MyDocument extends Document {
    createdAt: Date;
    discount?: number;
    total?: number;
}
type FuncProps = {
    length: number;
    docArr: MyDocument[];
    today: Date;
    property?: "discount" | "total";
}

export const getChartData = ({length, docArr, today, property} : FuncProps) => {
    const data: number[] = new Array(length).fill(0);

    docArr.forEach((i) => {
        const creationDate = i.createdAt;
        const monthDifference = (today.getMonth() - creationDate.getMonth() + 12) % 12;

        if (monthDifference < length) 
            data[length - monthDifference - 1] += property ? i[property]! : 1;
        
    })
    return data;
    
}
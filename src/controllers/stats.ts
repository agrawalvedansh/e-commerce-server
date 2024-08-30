import { myCache } from "../app.js";
import { AsyncErrorHandler } from "../middlewares/error.js"
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
import { calculatePercentage, getChartData } from "../utils/features.js";
import { applyDiscount } from "./payment.js";

export const getDashboardStats = AsyncErrorHandler(async (req, res, next) => {
    let stats = {};

    if(myCache.has("admin-stats"))
        stats = JSON.parse(myCache.get("admin-stats") as string);
    else {
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const thisMonth = {
            start: new Date(today.getFullYear(), today.getMonth(), 1),
            end: today,
        }

        const lastMonth = {
            start: new Date(today.getFullYear(), today.getMonth()-1, 1),
            end: new Date(today.getFullYear(), today.getMonth(), 0)
        }

        
        const thisMonthProductPromise = Product.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end,
            },
        })

        const lastMonthProductPromise = Product.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end,
            }
        })

        const thisMonthUserPromise = User.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end,
            },
        })

        const lastMonthUserPromise = User.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end,
            }
        })

        const thisMonthOrderPromise = Order.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end,
            },
        })

        const lastMonthOrderPromise = Order.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end,
            }
        })

        const lastSixMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: sixMonthsAgo,
                $lte: today,
            }
        })

        const latestTransactionPromise = Order.find({}).select(["orderItems", "discount", "total", "status"]).limit(4)

        const [thisMonthProduct, thisMonthUser, thisMonthOrder, lastMonthProduct, lastMonthUser, lastMonthOrder, productCount, userCount, allOrders, lastSixMonthOrders, categories, maleUserCount, latestTransaction] = await Promise.all([thisMonthProductPromise, thisMonthUserPromise, thisMonthOrderPromise, lastMonthProductPromise, lastMonthUserPromise, lastMonthOrderPromise, Product.countDocuments(), User.countDocuments(), Order.find({}).select("total"), lastSixMonthOrdersPromise, Product.distinct("category"), User.countDocuments({gender: "Male"}), latestTransactionPromise]);

        const userChangePercent = calculatePercentage(thisMonthUser.length, lastMonthUser.length);

        const productChangePercent = calculatePercentage(thisMonthProduct.length, lastMonthProduct.length);

        const orderChangePercent = calculatePercentage(thisMonthOrder.length, lastMonthOrder.length);

        const thisMonthRevenue = thisMonthOrder.reduce(
            (total, order) => total + (order.total || 0),
            0
        );  
        
        const lastMonthRevenue = lastMonthOrder.reduce(
            (total, order) => total + (order.total || 0),
            0
        );    

        const revenueChangePercent = calculatePercentage(thisMonthRevenue, lastMonthRevenue);
        
        const revenue = allOrders.reduce(
            (total, order) => total + (order.total || 0),
            0
        );    

        const count = {
            revenue: revenue,
            user: userCount,
            product: productCount,
            order: allOrders.length
        }

        const orderMonthlyCount = new Array(6).fill(0);
        const orderMonthlyRevenue = new Array(6).fill(0);

        lastSixMonthOrders.forEach((order) => {
            const creationDate = order.createdAt;
            const monthDifference = (today.getMonth() - creationDate.getMonth()+12)%12;

            if(monthDifference < 6) {
                orderMonthlyCount[6-monthDifference-1]+= 1;
                orderMonthlyRevenue[6-monthDifference-1]+= order.total;
            }
        })
        
        const categoriesCountPromise = categories.map((category) => Product.countDocuments({category}))
        const categoriesCount = await Promise.all(categoriesCountPromise);

        const categoryCount: Record<string, number>[] = [];
        categories.forEach((category, i) => {
            categoryCount.push({
                [category]: Math.round((categoriesCount[i]/productCount) * 100),
            })
        })
        
        const userRatio = {
            male: maleUserCount,
            female: userCount - maleUserCount
        }

        const modifiedLatestTransaction = latestTransaction.map((i) => ({
            _id: i._id,
            discount: i.discount,
            amount: i.total,
            quantity: i.orderItems.length,
            status: i.status,
        }))

        stats = {
            revenueChangePercent,
            productChangePercent,
            userChangePercent,
            orderChangePercent,
            count,
            chart: {
                order: orderMonthlyCount,
                revenue: orderMonthlyRevenue
            },
            categoryCount,
            userRatio,
            latestTransaction: modifiedLatestTransaction
        }

        myCache.set("admin-stats", JSON.stringify(stats))
        //still need to invalidate
    }
        
    return res.status(200).json({
        success:true,
        stats,
    })
})

export const getPieChart = AsyncErrorHandler(async (req, res, next) => {
    let charts;
    if(myCache.has("admin-pie-chart"))
        charts = JSON.parse(myCache.get("admin-pie-chart") as string)
    else 
    {
        const [processingOrder, shippedOrder, deliveredOrder, categories, productCount, productOutOfStock, allOrders, allUsers, adminUsers, customerUsers] = await Promise.all([
            Order.countDocuments({status: "Processing"}),
            Order.countDocuments({status: "Shipped"}),
            Order.countDocuments({status: "Delivered"}),
            Product.distinct("category"),
            Product.countDocuments(),
            Product.countDocuments({stock: 0}),
            Order.find({}).select(["total", "discount", "subtotal", "tax", 
                "shippingCharges"]),
            User.find({}).select(['dob']),
            User.countDocuments({role: "admin"}),
            User.countDocuments({role: "user"})
        ]);

        const orderFulfillment = {
            processing: processingOrder,
            shipped: shippedOrder,
            delivered: deliveredOrder
        }

        const categoriesCountPromise = categories.map((category) => Product.countDocuments({category}))
        const categoriesCount = await Promise.all(categoriesCountPromise);

        const productCategories: Record<string, number>[] = [];
        categories.forEach((category, i) => {
            productCategories.push({
                [category]: Math.round((categoriesCount[i]/productCount) * 100),
            })
        })

        const stockAvailability = {
            inStock: productCount - productOutOfStock, 
            outOfStock: productOutOfStock,
        }
        
        const grossIncome = allOrders.reduce(
            (prev, order) => prev + (order.total || 0),
            0
        );

        const discount = allOrders.reduce(
            (prev, order) => prev + (order.discount || 0),
            0
        )

        const productionCost = allOrders.reduce(
            (prev, order) => prev + (order.shippingCharges || 0),
            0
        )

        const burnt = allOrders.reduce((prev, order) => 
            prev + (order.tax || 0), 0);
        
        const marketingCost = Math.round(grossIncome * (30 / 100));

        const netMargin = grossIncome - discount - productionCost - burnt - marketingCost;

        const revenueDistribution = {
            netMargin,
            discount,
            productionCost,
            burnt,
            marketingCost,
        }

        const usersAgeGroup = {
            teen: allUsers.filter(i=>i.age<20).length,
            adult: allUsers.filter(i=>i.age>=20 && i.age<40).length,
            old: allUsers.filter(i=>i.age >= 40).length, 
        }

        const adminCustomer = {
            admin: adminUsers,
            customer: customerUsers,
        };

        charts = {
            orderFulfillment,
            productCategories,
            stockAvailability,
            revenueDistribution,
            usersAgeGroup,
            adminCustomer
        }
        myCache.set("admin-pie-chart", JSON.stringify(charts));
    }

    return res.status(200).json({
        success:true,
        charts,
    })
})

export const getBarChart = AsyncErrorHandler(async (req, res, next) => {
    const key = "admin-bar-charts";
    let charts;
    if(myCache.has(key))
        charts = (JSON.parse(myCache.get(key) as string))
    else {
        
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        
        const lastSixMonthProductPromise = Product.find({
            createdAt: {
                $gte: sixMonthsAgo,
                $lte: today,
            }
        }).select("createdAt");

        const lastSixMonthUserPromise = User.find({
            createdAt: {
                $gte: sixMonthsAgo,
                $lte: today,
            }
        }).select("createdAt");

        const lastTwelveMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: twelveMonthsAgo,
                $lte: today,
            }
        }).select("createdAt");

        const [products, users, orders] = await Promise.all([lastSixMonthProductPromise, lastSixMonthUserPromise, lastTwelveMonthOrdersPromise])

        const productCounts = getChartData({length: 6, today, docArr: products})
        const userCounts = getChartData({length: 6, today, docArr: users})
        const orderCounts = getChartData({length: 12, today, docArr: orders})

        charts = {
            productCounts,
            userCounts,
            orderCounts
        }

        myCache.set(key, JSON.stringify(charts));
    }   

    return res.status(200).json({
        success:true,
        charts,
    })
})

export const getLineChart = AsyncErrorHandler(async (req, res, next) => {
    const key = "admin-line-charts";
    let charts;
    if(myCache.has(key))
        charts = (JSON.parse(myCache.get(key) as string))
    else {
        
        const today = new Date();
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        
        const baseQuery = {
            createdAt: {
                $gte: twelveMonthsAgo,
                $lte: today,
            }
        }

        const lastTwelveMonthProductPromise = Product.find(baseQuery
        ).select("createdAt");

        const lastTwelveMonthUserPromise = User.find(baseQuery
        ).select("createdAt");

        const lastTwelveMonthOrdersPromise = Order.find(baseQuery
        ).select(["createdAt", "discount", "total"]);

        const [products, users, orders] = await Promise.all([lastTwelveMonthProductPromise, lastTwelveMonthUserPromise, lastTwelveMonthOrdersPromise])

        const productCounts = getChartData({length: 12, today, docArr: products})
        const userCounts = getChartData({length: 12, today, docArr: users})
        const discount = getChartData({length: 12, today, docArr: orders, property: "discount"})
        const revenue = getChartData({length: 12, today, docArr: orders, property: "total"})


        charts = {
            users: userCounts,
            product: productCounts,
            discount,
            revenue
        }

        myCache.set(key, JSON.stringify(charts));
    }   

    return res.status(200).json({
        success:true,
        charts,
    })
})
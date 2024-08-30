import { User } from "../models/user.js";
import CustomError from "../utils/utility-class.js";
import { AsyncErrorHandler } from "./error.js";

//middleware to make sure only admin is allowed
export const adminOnly = AsyncErrorHandler(async (req, res, next) => {
    const {id} = req.query;
    if(!id) return next(new CustomError("You are not logged-in", 401))
    const user = await User.findById(id);
    if(!user) return next(new CustomError("Invalid ID!", 401));
    
    if(user.role !== "admin")
            return next(new CustomError("Not an Admin!", 401));
    next();
})
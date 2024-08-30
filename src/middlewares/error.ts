import express, { NextFunction, Request, Response } from 'express'
import CustomError from '../utils/utility-class.js';
import { ControllerType } from '../types/types.js';


export const GlobalErrorMiddleware = (err:CustomError ,req:Request, res:Response, next:NextFunction) => {
    err.message ||= "Bad!";
    err.statusCode ||= 500;
    if(err.name === "CastError")err.message = "Invalid ID!"
    return res.status(err.statusCode).json({
        success: false,
        message: err.message,
    })
}

export const AsyncErrorHandler = (func: ControllerType) => (req:Request, res:Response, next:NextFunction) => {
    return Promise.resolve(func(req, res, next)).catch(next);
}
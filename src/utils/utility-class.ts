class CustomError extends Error {   //Simply defining our own custom error class
    constructor(public message: string, public statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}

export default CustomError
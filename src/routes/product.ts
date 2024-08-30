import express from 'express'
import { adminOnly } from '../middlewares/auth.js';
import { deleteProduct, getAdminProducts, getAllCategories, getAllProducts, getSingleProduct, getlatestProducts, newProduct, updateProduct } from '../controllers/product.js';
import { singleUpload } from '../middlewares/multer.js';

const app = express.Router();

//api/v1/product/new
app.post("/new", adminOnly, singleUpload, newProduct);

//api/v1/product/latest
app.get("/latest", getlatestProducts);

//api/v1/product/all (To get all products with filter)
app.get("/all", getAllProducts);

//api/v1/product/getAllCategories
app.get("/categories", getAllCategories);

//api/v1/product/admin-product?id=*
app.get("/admin-product", adminOnly, getAdminProducts);

app.route("/:id")
.get(getSingleProduct)
.put(adminOnly, singleUpload, updateProduct)
.delete(adminOnly, deleteProduct);

export default app;
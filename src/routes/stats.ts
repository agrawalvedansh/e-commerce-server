import express from 'express'
import { adminOnly } from '../middlewares/auth.js';
import { getBarChart, getDashboardStats, getLineChart, getPieChart } from '../controllers/stats.js';

const app = express.Router();

// api/v1/user/dashboard/stats
app.get("/stats", adminOnly, getDashboardStats)

// api/v1/user/dashboard/pie
app.get("/pie", adminOnly, getPieChart)

// api/v1/user/dashboard/bar
app.get("/bar", adminOnly, getBarChart)

// api/v1/user/dashboard/line
app.get("/line", adminOnly, getLineChart)

export default app;
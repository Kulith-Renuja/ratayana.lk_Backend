import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import countryRoutes from './routes/countryRoutes';
import adminRoutes from './routes/adminRoutes';
import usermanageRoutes from './routes/usermanageRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';

dotenv.config();

// Connect to MongoDB
connectDB();

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic test route
app.get('/', (req: Request, res: Response) => {
  res.send('API is running...');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/usermanage', usermanageRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

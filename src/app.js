import express from 'express';
import cookieParser from 'cookie-parser';
import errorHandler from './middlewares/error.middleware.js';
import cors from 'cors';
import passport from './config/passport.js';
import path from 'path';

import photoRouter from './routes/photoRoutes.js';
import shopRouter from './routes/shopRoutes.js';
import purchaseRouter from './routes/purchaseRoutes.js';
import authRouter from './routes/authRoutes.js';
import notificationRouter from './routes/notificationRoute.js';
import exchangeRouter from './routes/exchangeRoutes.js';
import userRouter from './routes/userRoutes.js';
import uploadRouter from './routes/uploadRoutes.js';

const app = express();
const PORT = process.env.PORT || 5005;

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use(
  cors({
    origin: ['http://localhost:3000', 'https://photo-frontend-lac.vercel.app'],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use(passport.initialize());

// 라우터 등록
app.use('/auth', authRouter);
app.use('/api', photoRouter);
app.use('/api/shop', shopRouter);
app.use('/api/users', userRouter);
app.use('/api/purchase', purchaseRouter);
app.use('/api/exchange', exchangeRouter);
app.use('/api/notification', notificationRouter);
app.use('/api/upload', uploadRouter);

//미들웨어
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`서버가 작동 중 입니다. 포트 번호: ${PORT}`);
});

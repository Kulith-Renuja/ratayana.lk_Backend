import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import User from '../models/User';
import { identifyTelco } from '../utils/telcoRouter';


export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, password } = req.body;

    const user = await User.findOne({ phoneNumber });
    if (!user || !user.password) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({ message: 'Your account has been blocked by an administrator.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const requestOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phoneNumber, password } = req.body;
    if (!name || !phoneNumber || !password) {
      res.status(400).json({ message: 'Name, phone number, and password are required' });
      return;
    }

    const networkProvider = identifyTelco(phoneNumber);
    let user = await User.findOne({ phoneNumber });

    if (user && user.subscriptionStatus === 'REGISTERED') {
      res.status(400).json({ message: 'User already registered with this phone number. Please login.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (!user) {
      user = new User({
        name,
        phoneNumber,
        password: hashedPassword,
        networkProvider,
        subscriptionStatus: 'PENDING'
      });
      await user.save();
    } else {
      user.name = name;
      user.password = hashedPassword;
      user.networkProvider = networkProvider;
      await user.save();
    }

    if (networkProvider === 'MSPACE') {
      const response = await axios.post('https://api.mspace.lk/otp/request', {
        applicationId: process.env.MSPACE_APP_ID,
        password: process.env.MSPACE_PASSWORD,
        subscriberId: `tel:${phoneNumber}`,
        applicationHash: "ratayana"
      });
      user.otpReferenceNo = response.data?.referenceNo || Math.floor(100000 + Math.random() * 900000).toString();
      await user.save();
    } else if (networkProvider === 'IDEAMART') {
      const localOtp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otpReferenceNo = localOtp;
      await user.save();

      await axios.post('https://api.ideamart.io/sms/send', {
        applicationId: process.env.IDEAMART_APP_ID,
        password: process.env.IDEAMART_PASSWORD,
        destinationAddresses: [`tel:${phoneNumber}`],
        message: `Your Ratayana verification code is ${localOtp}`,
        sourceAddress: process.env.IDEAMART_APP_ID
      });
    }

    res.status(200).json({ message: 'OTP requested successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, otp } = req.body;
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    let success = false;

    if (user.networkProvider === 'MSPACE') {
      try {
        const response = await axios.post('https://api.mspace.lk/otp/verify', {
          applicationId: process.env.MSPACE_APP_ID,
          password: process.env.MSPACE_PASSWORD,
          referenceNo: user.otpReferenceNo,
          otp: otp
        });

        // STRICT CHECK: Only S1000 means success.
        if (response.data?.statusCode === 'S1000') {
          success = true;
        } else {
          console.error("mSpace Verification Failed:", response.data);
        }
      } catch (err) {
        console.error("mSpace API Error:", err);
        success = false;
      }
    } else if (user.networkProvider === 'IDEAMART') {
      if (user.otpReferenceNo === otp) {
        try {
          const response = await axios.post('https://api.ideamart.io/subscription/send', {
            applicationId: process.env.IDEAMART_APP_ID,
            password: process.env.IDEAMART_PASSWORD,
            subscriberId: `tel:${phoneNumber}`,
            action: "1"
          });

          // STRICT CHECK: Only S1000 means success.
          if (response.data?.statusCode === 'S1000') {
            success = true;
          } else {
            console.error("Ideamart Subscription Failed:", response.data);
          }
        } catch (err) {
          console.error("Ideamart API Error:", err);
          success = false;
        }
      } else {
        console.error("Local OTP mismatch for Ideamart user");
      }
    }

    if (success) {
      user.subscriptionStatus = 'REGISTERED';
      user.otpReferenceNo = '';
      await user.save();

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: '1d' }
      );

      res.status(200).json({
        message: 'Subscription successful',
        token,
        user: {
          _id: user._id,
          name: user.name,
          phoneNumber: user.phoneNumber,
          role: user.role,
          subscriptionStatus: user.subscriptionStatus
        }
      });
    } else {
      res.status(400).json({ message: 'Invalid OTP or subscription failed' });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};


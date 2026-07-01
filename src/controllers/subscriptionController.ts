import { Response } from 'express';
import axios from 'axios';
import User from '../models/User';
import { AuthRequest } from '../middlewares/authMiddleware';

export const checkStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    let isRegistered = false;

    if (user.networkProvider === 'MSPACE') {
      try {
        const response = await axios.post('https://api.mspace.lk/subscription/getStatus', {
          applicationId: process.env.MSPACE_APP_ID,
          password: process.env.MSPACE_PASSWORD,
          subscriberId: `tel:${user.phoneNumber}`
        });
        if (response.data?.subscriptionStatus === 'REGISTERED') isRegistered = true;
      } catch (err) {
        console.error("mSpace GetStatus API Error:", err);
      }
    } else if (user.networkProvider === 'IDEAMART') {
      try {
        const response = await axios.post('https://api.ideamart.io/subscription/getStatus', {
          applicationId: process.env.IDEAMART_APP_ID,
          password: process.env.IDEAMART_PASSWORD,
          subscriberId: `tel:${user.phoneNumber}`
        });
        if (response.data?.subscriptionStatus === 'REGISTERED') isRegistered = true;
      } catch (err) {
        console.error("Ideamart GetStatus API Error:", err);
      }
    }

    if (!isRegistered) {
      user.subscriptionStatus = 'UNREGISTERED';
      await user.save();
    }

    res.status(200).json({ subscriptionStatus: user.subscriptionStatus });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const toggleSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { action } = req.body;
    const user = await User.findById(req.user?.userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    let success = false;

    if (user.networkProvider === 'MSPACE') {
      try {
        const response = await axios.post('https://api.mspace.lk/subscription/send', {
          applicationId: process.env.MSPACE_APP_ID,
          password: process.env.MSPACE_PASSWORD,
          subscriberId: `tel:${user.phoneNumber}`,
          action: action
        });

        // STRICT CHECK
        if (response.data?.statusCode === 'S1000') {
          success = true;
        } else {
          console.error("mSpace Subscription Toggle Failed:", response.data);
        }
      } catch (err) {
        console.error("mSpace API Error (Toggle):", err);
      }
    } else if (user.networkProvider === 'IDEAMART') {
      try {
        const response = await axios.post('https://api.ideamart.io/subscription/send', {
          applicationId: process.env.IDEAMART_APP_ID,
          password: process.env.IDEAMART_PASSWORD,
          subscriberId: `tel:${user.phoneNumber}`,
          action: action
        });

        // STRICT CHECK
        if (response.data?.statusCode === 'S1000') {
          success = true;
        } else {
          console.error("Ideamart Subscription Toggle Failed:", response.data);
        }
      } catch (err) {
        console.error("Ideamart API Error (Toggle):", err);
      }
    }

    if (success) {
      user.subscriptionStatus = action === "1" ? 'REGISTERED' : 'UNREGISTERED';
      await user.save();
      res.status(200).json({ message: 'Subscription updated successfully', subscriptionStatus: user.subscriptionStatus });
    } else {
      res.status(400).json({ message: 'Failed to update subscription' });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};
import cron from 'node-cron';
import axios from 'axios';
import User from '../models/User';

export const startSubscriptionCheckCron = () => {
  // Run every 48 hours
  cron.schedule('0 0 */2 * *', async () => {
    console.log('Running subscription check cron job...');
    try {
      const users = await User.find({ subscriptionStatus: 'REGISTERED' });
      
      for (const user of users) {
        try {
          let isRegistered = true;

          if (user.networkProvider === 'MSPACE') {
            const response = await axios.post('https://api.mspace.lk/subscription/getStatus', {
              applicationId: process.env.MSPACE_APP_ID,
              password: process.env.MSPACE_PASSWORD,
              subscriberId: `tel:${user.phoneNumber}`
            });
            
            if (response.data?.subscriptionStatus !== 'REGISTERED') {
              isRegistered = false;
            }
          } else if (user.networkProvider === 'IDEAMART') {
            const response = await axios.post('https://api.ideamart.io/subscription/getStatus', {
              applicationId: process.env.IDEAMART_APP_ID,
              password: process.env.IDEAMART_PASSWORD,
              subscriberId: `tel:${user.phoneNumber}`
            });
            
            if (response.data?.subscriptionStatus !== 'REGISTERED') {
              isRegistered = false;
            }
          }

          if (!isRegistered) {
            user.subscriptionStatus = 'UNREGISTERED';
            await user.save();
            console.log(`User ${user.phoneNumber} subscription downgraded to UNREGISTERED.`);
          }
        } catch (error: any) {
          console.error(`Failed to check subscription for user ${user.phoneNumber}:`, error.message);
          
          // If the API throws a specific termination/unregistered error, gracefully downgrade the user
          if (error.response?.data?.subscriptionStatus === 'UNREGISTERED') {
            user.subscriptionStatus = 'UNREGISTERED';
            await user.save();
            console.log(`User ${user.phoneNumber} subscription downgraded to UNREGISTERED due to API error status.`);
          }
        }
      }
      console.log('Subscription check cron job completed successfully.');
    } catch (error) {
      console.error('Error executing subscription check cron job:', error);
    }
  });
};

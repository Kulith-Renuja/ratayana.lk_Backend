import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  phoneNumber: string;
  password?: string;
  role: 'user' | 'admin';
  isBlocked: boolean;
  subscriptionStatus: 'REGISTERED' | 'UNREGISTERED' | 'PENDING';
  networkProvider: 'MSPACE' | 'IDEAMART' | 'UNKNOWN';
  otpReferenceNo?: string;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isBlocked: { type: Boolean, default: false },
  subscriptionStatus: { type: String, enum: ['REGISTERED', 'UNREGISTERED', 'PENDING'], default: 'UNREGISTERED' },
  networkProvider: { type: String, enum: ['MSPACE', 'IDEAMART', 'UNKNOWN'], default: 'UNKNOWN' },
  otpReferenceNo: { type: String, default: null },
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);

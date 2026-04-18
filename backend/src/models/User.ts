import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: 'restaurant' | 'ngo' | 'admin';
  orgName: string;
  location: {
    lat: number;
    lng: number;
  };
  isVerified: boolean;
  verificationCode: string | null;
  verificationCodeExpiry: Date | null;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['restaurant', 'ngo', 'admin'], required: true },
    orgName: { type: String, required: true },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: null },
    verificationCodeExpiry: { type: Date, default: null },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);

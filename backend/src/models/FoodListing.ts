import mongoose, { Document, Schema } from 'mongoose';

export interface IFoodListing extends Document {
  restaurantId: mongoose.Types.ObjectId;
  foodName: string;
  quantity: number;
  expiryDatetime: Date;
  location: {
    lat: number;
    lng: number;
  };
  status: 'available' | 'claimed' | 'delivered';
  foodType: string;
  createdAt: Date;
}

const FoodListingSchema = new Schema<IFoodListing>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    foodName: { type: String, required: true },
    quantity: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => v > 0,
        message: 'Quantity must be a positive number',
      },
    },
    expiryDatetime: { type: Date, required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ['available', 'claimed', 'delivered'],
      default: 'available',
    },
    foodType: { type: String },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export const FoodListingModel = mongoose.model<IFoodListing>('FoodListing', FoodListingSchema);

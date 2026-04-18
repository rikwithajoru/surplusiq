import mongoose, { Document, Schema } from 'mongoose';

export interface IFoodRequest extends Document {
  listingId: mongoose.Types.ObjectId;
  ngoId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  status: 'requested' | 'accepted' | 'delivered';
  createdAt: Date;
  updatedAt: Date;
}

const FoodRequestSchema = new Schema<IFoodRequest>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'FoodListing', required: true },
    ngoId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['requested', 'accepted', 'delivered'],
      default: 'requested',
    },
  },
  { timestamps: true }
);

export const FoodRequestModel = mongoose.model<IFoodRequest>('FoodRequest', FoodRequestSchema);

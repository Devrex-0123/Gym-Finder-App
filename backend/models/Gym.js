import mongoose from 'mongoose';

const gymSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: null, trim: true },
    barangay: { type: String, default: null, trim: true },
    city: { type: String, default: null, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (coordinates) =>
            coordinates.length === 2 &&
            coordinates.every(Number.isFinite) &&
            coordinates[0] >= -180 &&
            coordinates[0] <= 180 &&
            coordinates[1] >= -90 &&
            coordinates[1] <= 90,
          message: 'location.coordinates must be [longitude, latitude].',
        },
      },
    },
    pricePerMonth: { type: Number, min: 0, default: null },
    pricePerSession: { type: Number, min: 0, default: null },
    rating: { type: Number, min: 0, max: 5, default: null },
    totalReviews: { type: Number, min: 0, default: null },
    amenities: { type: [String], default: [] },
    hours: { type: String, default: null },
    is24Hours: { type: Boolean, default: false },
    phone: { type: String, default: null, trim: true },
    image: { type: String, default: null, trim: true },
    source: {
      type: String,
      enum: ['manual', 'osm'],
      required: true,
      default: 'manual',
    },
    isActive: { type: Boolean, default: true },
    // Where a manually added listing came from, and whether its pin is only
    // street/landmark-level (not the exact building).
    sourceUrl: { type: String, default: null, trim: true },
    locationApproximate: { type: Boolean, default: false },
    osmType: { type: String, default: null },
    osmId: { type: Number, default: null },
  },
  { timestamps: true },
);

gymSchema.index({ location: '2dsphere' });
gymSchema.index(
  { osmType: 1, osmId: 1 },
  {
    unique: true,
    partialFilterExpression: { source: 'osm' },
  },
);

const Gym = mongoose.model('Gym', gymSchema);

export default Gym;

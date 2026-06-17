const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    description: {
      type: String
    },

    price: {
      type: Number,
      required: true
    },

    image: [
      {
        type: [String]
      }
    ],

    category: {
      type: String,
      required: true
    },

    subCategory: {
      type: String
    },

    flavor: [
      {
        type: String
      }
    ],

    bestseller: {
      type: Boolean,
      default: false
    },

    stock: {
      type: Number,
      default: 0
    },

    onSale: {
      type: Boolean,
      default: false
    },

    offerPrice: {
      type: Number
    }
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Product", productSchema);

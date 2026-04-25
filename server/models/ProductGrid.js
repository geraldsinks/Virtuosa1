const mongoose = require('mongoose');

const productGridSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    position: {
        type: Number,
        default: 0
    },
    active: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for efficient homepage queries
productGridSchema.index({ active: 1, position: 1 });

const ProductGrid = mongoose.model('ProductGrid', productGridSchema);
module.exports = ProductGrid;

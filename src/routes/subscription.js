const express = require('express');
const Razorpay = require('razorpay');
require('dotenv').config();

const router = express.Router();

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Subscription
router.post('/create', async (req, res) => {
    const { customer_id } = req.body; // Get customer ID from request body

    try {
        // Create the subscription
        const subscription = await razorpay.subscriptions.create({
            plan_id: process.env.RAZORPAY_PLAN_ID, // Use plan ID from .env
            customer_id: customer_id,
            total_count: 12, // Total payments to be made (e.g., 12 for a yearly subscription)
            start_at: Math.floor(Date.now() / 1000) + 30, // Start the subscription after 30 seconds
        });

        res.status(201).json({
            message: 'Subscription created successfully',
            subscription,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error creating subscription',
            error,
        });
    }
});

// Retrieve Subscription
router.get('/:subscriptionId', async (req, res) => {
    const { subscriptionId } = req.params;

    try {
        const subscription = await razorpay.subscriptions.fetch(subscriptionId);
        res.status(200).json(subscription);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error fetching subscription',
            error,
        });
    }
});

// Cancel Subscription
router.post('/cancel/:subscriptionId', async (req, res) => {
    const { subscriptionId } = req.params;

    try {
        const response = await razorpay.subscriptions.cancel(subscriptionId);
        res.status(200).json({
            message: 'Subscription cancelled successfully',
            response,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error cancelling subscription',
            error,
        });
    }
});

module.exports = router;

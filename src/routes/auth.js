const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const Razorpay = require('razorpay');
require('dotenv').config();

const router = express.Router();

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


// Signup API
router.post(
    '/signup',
    [
        body('name').notEmpty(),
        body('email').isEmail(),
        body('mobile').notEmpty(),
        body('password').isLength({ min: 6 }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, mobile, password } = req.body;

        try {
            // Check if email or mobile already exists
            const checkQuery = 'SELECT * FROM users WHERE email = ? OR mobile_number = ?';
            db.query(checkQuery, [email, mobile], async (err, results) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err });
                }

                if (results.length > 0) {
                    return res.status(400).json({ message: 'User already exists...' });
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(password, 10);

                let razorpayCustomerId;
                try {
                    // Create Razorpay Customer
                    const razorpayCustomer = await razorpay.customers.create({
                        name: name,
                        email: email,
                        contact: mobile,
                    });
                    razorpayCustomerId = razorpayCustomer.id; // Extract customer ID
                } catch (razorpayError) {
                    return res.status(500).json({ message: 'Error creating Razorpay customer', error: razorpayError });
                }

                // Insert user into database with Razorpay customer ID
                const insertQuery = 'INSERT INTO users (name, email, mobile_number, password, rzp_customer_id) VALUES (?, ?, ?, ?, ?)';
                db.query(insertQuery, [name, email, mobile, hashedPassword, razorpayCustomerId], (err, result) => {
                    if (err) {
                        return res.status(500).json({ message: 'Database error', error: err });
                    }


                    res.status(201).json({
                        message: 'User registered successfully',

                        razorpayCustomerId: razorpayCustomerId,
                        user: {
                            name,
                            email,
                            mobile,
                            razorpayCustomerId
                        },
                    });
                });
            });
        } catch (error) {
            res.status(500).json({ message: 'Error registering user', error });
        }
    }
);

// Login API
router.post(
    '/login',
    [body('email').isEmail(), body('password').notEmpty()],
    async (req, res) => {
        const { email, password } = req.body;

        const query = 'SELECT * FROM users WHERE email = ?';
        db.query(query, [email], async (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err });

            if (results.length === 0) {
                return res.status(400).json({ message: 'Invalid email or password' });
            }

            const user = results[0];

            // Check password match
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.status(400).json({ message: 'Invalid email or password' });
            }

            // Generate JWT token
            const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
                expiresIn: '1h',
            });

            // Send response with user details and Razorpay customer ID
            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    mobile: user.mobile_number,
                    razorpayCustomerId: user.rzp_customer_id
                },
            });
        });
    }
);



// // Signup API
// router.post(
//   '/signup',
//   [
//     body('name').notEmpty(),
//     body('email').isEmail(),
//     body('mobile').notEmpty(),
//     body('password').isLength({ min: 6 }),
//   ],
//   async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     const { name, email, mobile, password } = req.body;

//     try {
//       const hashedPassword = await bcrypt.hash(password, 10);
//       const query = 'INSERT INTO users (name, email, mobile_number, password) VALUES (?, ?, ?, ?)';
//       db.query(query, [name, email, mobile, hashedPassword], (err, result) => {
//         if (err) {
//           if (err.code === 'ER_DUP_ENTRY') {
//             return res.status(400).json({ message: 'Email already exists' });
//           }
//           return res.status(500).json({ message: 'Database error', error: err });
//         }
//         res.status(201).json({ message: 'User registered successfully' });
//       });
//     } catch (error) {
//       res.status(500).json({ message: 'Error registering user', error });
//     }
//   }
// );

// Login API
// router.post(
//     '/login',
//     [body('email').isEmail(), body('password').notEmpty()],
//     (req, res) => {
//         const { email, password } = req.body;

//         const query = 'SELECT * FROM users WHERE email = ?';
//         db.query(query, [email], async (err, results) => {
//             if (err) return res.status(500).json({ message: 'Database error', error: err });

//             if (results.length === 0) {
//                 return res.status(400).json({ message: 'Invalid email or password' });
//             }

//             const user = results[0];

//             const passwordMatch = await bcrypt.compare(password, user.password);
//             if (!passwordMatch) {
//                 return res.status(400).json({ message: 'Invalid email or password' });
//             }

//             const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
//                 expiresIn: '1h',
//             });

//             res.json({ message: 'Login successful', token });
//         });
//     }
// );

module.exports = router;

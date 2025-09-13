require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();

const PORT = process.env.PORT;
const SECRET_KEY = process.env.SECRET_KEY;
const CORS_ORIGIN = process.env.CORS_ORIGIN;
const MONGO_URI = process.env.MONGO_URI;

// If you have a folder named 'MurabbaData' in the same directory, use:
const jsonMurabbaPath = path.join(__dirname, 'MurabbaData');

// Middleware Configuration
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// User Schema
const userSchema = new mongoose.Schema({
  userName: String,
  userId: { type: String, unique: true, required: true },
  password: String,
  tehsil: String,
  mobileNumber: String,
  mauzaList: [String],
  startDate: Date,
  subscriptionType: String,
  endDate: Date,
  daysRemaining: Number,
  status: String,
  userType: { type: String, enum: ['user', 'admin'], default: 'user' }
});

// Helper: Calculate End Date, Days Remaining, and Status
const calculateDatesAndStatus = (startDate, subscriptionType) => {
  const subscriptionDays = {
    Trial: 5,
    Monthly: 30,
    Quarterly: 90,
    Biannual: 180,
    Annual: 1000,
  };

  const days = subscriptionDays[subscriptionType] || 0;
  const start = new Date(startDate);
  const endDate = new Date(start.setDate(start.getDate() + days));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysRemaining = Math.max(
    Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)),
    0
  );
  const status = daysRemaining > 0 ? 'Active' : 'Inactive';

  return { endDate, daysRemaining, status };
};

// Middleware: Hash Password and Calculate Status before Save
userSchema.pre('save', async function (next) {
  try {
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    const { endDate, daysRemaining, status } = calculateDatesAndStatus(
      this.startDate,
      this.subscriptionType
    );
    this.endDate = endDate;
    this.daysRemaining = daysRemaining;
    this.status = status;

    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

// Login Route (Remove or extend token expiration so user stays logged in)
app.post('/login', async (req, res) => {
  const { userId, password } = req.body;
  try {
    const user = await User.findOne({ userId });
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ message: 'Invalid user ID or password.' });
    }

    // Check subscription validity
    const { daysRemaining, status, endDate } = calculateDatesAndStatus(
      user.startDate,
      user.subscriptionType
    );
    if (status === 'Inactive') {
      return res.status(403).json({
        message: 'Subscription Expired',
        userDetails: {
          userName: user.userName,
          startDate: user.startDate,
          endDate: endDate,
          daysRemaining: daysRemaining,
        },
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Incorrect password');
      return res.status(401).json({ message: 'Invalid user ID or password.' });
    }

    // Generate a token with extended expiration time (30 days)
    const token = jwt.sign({ userId: user.userId }, SECRET_KEY, { expiresIn: '30d' });

    res
      .cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Ensures secure flag in production
        sameSite: 'strict', // Prevents CSRF attacks
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
      })
      .json({ message: 'Login successful', user: { userId: user.userId, userName: user.userName } });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});


// Register Route
app.post('/register', async (req, res) => {
  try {
    const { password, ...userData } = req.body;

    const newUser = new User({
      ...userData,
      password, // plain password, to be hashed in pre-save
      mauzaList: req.body.mauzaList.map(m => m.trim()),
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Registration failed:', error.message);
    res.status(400).json({ error: 'Registration failed', details: error.message });
  }
});

// Update User Route
app.put('/users/:userId', async (req, res) => {
  try {
    const updateData = { ...req.body };

    // If password is provided and not empty, hash it
    if (updateData.password && updateData.password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    } else {
      delete updateData.password;
    }

    const user = await User.findOneAndUpdate(
      { userId: req.params.userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Failed to update user:', error.message);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Get All Users Route
app.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get User by ID Route
app.get('/users/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error.message);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Delete User Route
app.delete('/users/:userId', async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ userId: req.params.userId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ message: 'User deleted successfully!' });
  } catch (error) {
    console.error('Failed to delete user:', error.message);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Change Password Route
app.post('/change-password', async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  try {
    // Find the user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect old password.' });
    }

    // Assign new plain password (will be hashed in pre-save)
    user.password = newPassword;
    await user.save();

    // Clear the authToken cookie
    res
      .clearCookie('authToken', { httpOnly: true, path: '/' })
      .status(200)
      .json({ message: 'Password changed successfully. Please log in again.' });
  } catch (error) {
    console.error('Password change error:', error.message);
    res.status(500).json({ message: 'Failed to change password.' });
  }
});

// Logout Route
app.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({ message: 'Logout successful' });
});

// Authentication Middleware
const isAuthenticated = async (req, res, next) => {
  const token = req.cookies.authToken;
  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    try {
      // Verify user in the database
      const user = await User.findOne({ userId: decoded.userId });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check subscription validity
      const { daysRemaining, status } = calculateDatesAndStatus(
        user.startDate,
        user.subscriptionType
      );

      if (status === 'Inactive') {
        // Clear cookie if subscription is expired
        res.clearCookie('authToken');
        return res.status(403).json({
          message: 'Subscription Expired',
          userDetails: {
            userName: user.userName,
            startDate: user.startDate,
            endDate: user.endDate,
            daysRemaining: daysRemaining,
          }
        });
      }

      req.userId = user.userId;
      next();
    } catch (error) {
      console.error('Error in isAuthenticated middleware:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
};

// Profile Route
app.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.userId }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    console.error('Failed to fetch profile:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to fetch all Tehsil folders
app.get('/api/tehsils', (req, res) => {
  fs.readdir(jsonMurabbaPath, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error('Error reading Tehsil directory:', err);
      return res.status(500).json({ error: 'Unable to fetch Tehsil data' });
    }

    const tehsils = files
      .filter((file) => file.isDirectory())
      .map((folder) => folder.name)
      .sort();

    res.json(tehsils);
  });
});

// Endpoint to fetch all Mauza files within a specific Tehsil folder
app.get('/api/mauzas/:tehsil', (req, res) => {
  const tehsil = req.params.tehsil;
  const tehsilPath = path.join(jsonMurabbaPath, tehsil);

  fs.readdir(tehsilPath, (err, files) => {
    if (err) {
      console.error(`Error reading Mauza files for Tehsil "${tehsil}":`, err);
      return res.status(500).json({
        error: `Unable to fetch Mauza data for Tehsil ${tehsil}`
      });
    }

    const mauzas = files
      .filter((file) => file.endsWith('.geojson'))
      .map((file) => file.replace('.geojson', ''))
      .sort();

    res.json(mauzas);
  });
});

// Start Server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

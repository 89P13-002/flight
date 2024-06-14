import User from "../models/User.js";
import bcrypt from "bcryptjs";
import Booking from "../models/Bookings.js"; 

// Get all users
export const getAllUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find();
  } catch (err) {
    return console.log(err);
  }
  if (!users) {
    return res.status(500).json({ message: "Unexpected Error Occurred" });
  }
  return res.status(200).json({ users });
};

// Sign up new user
export const signup = async (req, res, next) => {
  const { name, email, password } = req.body;

  // Validate inputs
  if (!name && !email && !password  && !name.trim() === "" &&  !email.trim() === "" && !password.trim() === "" ) {
    return res.status(422).json({ message: "Invalid Inputs" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  let user;
  try {
    user = new User({
      name,
      email,
      password: hashedPassword
    });
    user = await user.save();
  } catch (err) {
    return console.log(err);
  }
  if (!user) {
    return res.status(500).json({ message: "Unexpected Error Occurred" });
  }
  return res.status(201).json({ id: user._id });
};

// Update user by ID
export const updateUser = async (req, res, next) => {
  const id = req.params.id;
  const { name, email, password } = req.body;

  if (!name && !email && !password  && !name.trim() === ""  && !email.trim() === "" && !password.trim() === "" ) {
    return res.status(422).json({ message: "Invalid Inputs" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  let user;
  try {
    user = await User.findByIdAndUpdate(id, {
      name,
      email,
      password: hashedPassword
    }, { new: true, runValidators: true });
  } catch (err) {
    return console.log(err);
  }
  if (!user) {
    return res.status(500).json({ message: "Something went wrong" });
  }
  return res.status(200).json({ message: "Updated Successfully" });
};

// Delete user by ID
export const deleteUser = async (req, res, next) => {
  const id = req.params.id;
  let user;
  try {
    user = await User.findByIdAndRemove(id);
  } catch (err) {
    return console.log(err);
  }
  if (!user) {
    return res.status(500).json({ message: "Something went wrong" });
  }
  return res.status(200).json({ message: "Deleted Successfully" });
};

// User login
export const login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email && !password && !email.trim() === "" && !password.trim() === "") {
    return res.status(422).json({ message: "Invalid Inputs" });
  }
  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    return console.log(err);
  }

  if (!existingUser) {
    return res.status(404).json({ message: "Unable to find user with this email" });
  }

  const isPasswordCorrect = bcrypt.compareSync(password, existingUser.password);

  if (!isPasswordCorrect) {
    return res.status(400).json({ message: "Incorrect Password" });
  }

  return res.status(200).json({ message: "Login Successful", id: existingUser._id });
};

// Get bookings of a user by user ID
export const getBookingsOfUser = async (req, res, next) => {
  const id = req.params.id;
  let bookings;
  try {
    bookings = await Booking.find({ user: id })
      .populate("flight")
      .populate("user");
  } catch (err) {
    return console.log(err);
  }
  if (!bookings) {
    return res.status(500).json({ message: "Unable to get Bookings" });
  }
  return res.status(200).json({ bookings });
};

// Get user by ID
export const getUserById = async (req, res, next) => {
  const id = req.params.id;
  let user;
  try {
    user = await User.findById(id);
  } catch (err) {
    return console.log(err);
  }
  if (!user) {
    return res.status(500).json({ message: "Unexpected Error Occurred" });
  }
  return res.status(200).json({ user });
};



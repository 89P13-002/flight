import mongoose from "mongoose";
import Booking from "../models/Bookings.js";
import Flight from "../models/Flight.js";
import User from "../models/User.js";
import razorpay from "../config/razorpay.js";

export const addFlightBooking = async (req, res, next) => {
  const { flightId, seatNumber, userId, amount } = req.body;

  let existingFlight;
  let existingUser;

  try {
    existingFlight = await Flight.findById(flightId);
    existingUser = await User.findById(userId);
  } catch (err) {
    console.error("Error finding flight or user:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }

  if (!existingFlight) {
    return res.status(404).json({ message: "Flight not found with the given ID" });
  }

  if (!existingUser) {
    return res.status(404).json({ message: "User not found with the given ID" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // amount in the smallest currency unit
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    if (!order) {
      throw new Error("Error creating Razorpay order");
    }

    // Create and save new booking
    const booking = new Booking({
      flight: existingFlight._id,
      passenger: existingUser._id,
      seatNumber,
      bookingDate: new Date(), // current date and time
      status: "Pending", // default status
      receipt: order.receipt, // receipt from Razorpay order
    });

    await booking.save({ session });

    // Update user and flight with the new booking
    existingUser.bookings.push(booking);
    existingFlight.bookings.push(booking);

    await existingUser.save({ session });
    await existingFlight.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({ booking });
  } catch (err) {
    console.error("Error creating booking:", err);
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ message: "Failed to create booking" });
  }
};



export const getFlightBookingById = async (req, res, next) => {
  const id = req.params.id;
  let booking;
  try {
    booking = await FlightBooking.findById(id);
  } catch (err) {
    return console.log(err);
  }
  if (!booking) {
    return res.status(500).json({ message: "Unexpected Error" });
  }
  return res.status(200).json({ booking });
};


export const deleteFlightBooking = async (req, res, next) => {
  const id = req.params.id;
  let booking;
  try {
    booking = await FlightBooking.findByIdAndRemove(id).populate("user flight");
    
    const session = await mongoose.startSession();
    session.startTransaction();

    await booking.user.bookings.pull(booking);
    await booking.flight.bookings.pull(booking);

    await booking.flight.save({ session });
    await booking.user.save({ session });

    await session.commitTransaction();
  } catch (err) {
    return console.log(err);
  }
  if (!booking) {
    return res.status(500).json({ message: "Unable to Delete" });
  }
  return res.status(200).json({ message: "Successfully Deleted" });
};

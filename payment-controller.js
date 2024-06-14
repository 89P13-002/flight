import crypto from "crypto";
import razorpay from "../config/razorpay.js";
import Booking from "../models/Bookings.js";

export const createOrder = async (req, res) => {
  const { amount, currency, receipt } = req.body;

  try {
    const options = {
      amount: amount * 100, // amount in smallest currency unit
      currency,
      receipt,
    };

    const order = await razorpay.orders.create(options);
    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Unable to create order" });
  }
};

export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    // Payment is successful, update booking status
    try {
      const booking = await Booking.findOne({ receipt: razorpay_order_id });
      if (booking) {
        booking.status = "Paid";
        await booking.save();
        res.status(200).json({ message: "Payment verified successfully", booking });
      } else {
        res.status(404).json({ message: "Booking not found" });
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    res.status(400).json({ message: "Invalid signature" });
  }
};

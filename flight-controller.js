import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Admin from "../models/Admin.js";
import Flight from "../models/Flight.js";

// Add a flight
export const addFlight = async (req, res, next) => {
  const { airline, flightNumber, departureAirport, arrivalAirport, departureTime, arrivalTime, duration, price, availableSeats, classType, adminId } = req.body;

  if (
    !airline || airline.trim() === "" ||
    !flightNumber || flightNumber.trim() === "" ||
    !departureAirport || departureAirport.trim() === "" ||
    !arrivalAirport || arrivalAirport.trim() === "" ||
    !departureTime || departureTime.trim() === "" ||
    !arrivalTime || arrivalTime.trim() === "" ||
    !duration || duration.trim() === "" ||
    !price || price <= 0 ||
    !availableSeats || availableSeats <= 0 ||
    !classType || classType.trim() === "" ||
    !adminId || adminId.trim() === ""
  ) {
    return res.status(422).json({ message: "Invalid Inputs" });
  }

  let admin;
  try {
    admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: "Fetching admin failed", error: err.message });
  }

  // Check if the flight already exists
  let existingFlight;
  try {
    existingFlight = await Flight.findOne({ airline, flightNumber, departureTime });
    if (existingFlight) {
      return res.status(400).json({ message: "Flight already exists" });
    }
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }

  let flight;
  try {
    flight = new Flight({
      airline,
      flightNumber,
      departureAirport,
      arrivalAirport,
      departureTime: new Date(departureTime),
      arrivalTime: new Date(arrivalTime),
      duration,
      price,
      availableSeats,
      classType,
      bookings: [], // Initialize as empty array
      editedByAdmin: adminId
    });

    const session = await mongoose.startSession();
    session.startTransaction();
    await flight.save({ session });
    admin.managedFlights.push(flight);
    await admin.save({ session });
    await session.commitTransaction();
  } catch (err) {
    return res.status(500).json({ message: "Creating flight failed", error: err.message });
  }

  if (!flight) {
    return res.status(500).json({ message: "Flight creation failed" });
  }

  return res.status(201).json({ flight });
};

// Get all flights
export const getAllFlights = async (req, res, next) => {
  let flights;

  try {
    flights = await Flight.find();
  } catch (err) {
    return console.log(err);
  }

  if (!flights) {
    return res.status(500).json({ message: "Request Failed" });
  }
  return res.status(200).json({ flights });
};

// Search flight
export const searchFlights = async (req, res, next) => {
  const from = req.params.from;
  const to = req.params.to;
  const departureDate = req.params.departureDate;
  const returnDate = req.params.returnDate;
  const classType = req.params.classType;
  
  // Validate input
  if (!from || !to || !departureDate) {
    return res.status(400).json({ message: 'Invalid input: from, to, and departureDate are required' });
  }

  let flightQuery = {
    departureAirport: from,
    arrivalAirport: to,
    departureTime: { $gte: new Date(departureDate) },
  };

  // Add classType to query if provided
  if (classType) {
    flightQuery.classType = classType;
  }

  let flights;
  try {
    flights = await Flight.find(flightQuery);

    // If returnDate is provided, find return flights as well
    if (returnDate) {
      const returnFlights = await Flight.find({
        departureAirport: to,
        arrivalAirport: from,
        departureTime: { $gte: new Date(returnDate) },
        ...(classType && { classType: classType }), // Include classType if provided
      });
      return res.status(200).json({ flights, returnFlights });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }

  return res.status(200).json({ flights });
};



// Update flight details
export const updateFlight = async (req, res, next) => {
  const id = req.params.id;

  const extractedToken = req.headers.authorization.split(" ")[1];
  if (!extractedToken && extractedToken.trim() === "") {
    return res.status(404).json({ message: "Token Not Found" });
  }

  let adminId;

  // Verify token
  jwt.verify(extractedToken, process.env.SECRET_KEY, (err, decrypted) => {
    if (err) {
      return res.status(400).json({ message: `${err.message}` });
    } else {
      adminId = decrypted.id;
    }
  });

  // Check if admin has permission to update flight
  const adminUser = await Admin.findById(adminId);
  if (!adminUser) {
    return res.status(404).json({ message: "Admin not found" });
  }
  if (!adminUser.permissions.includes("WRITE")) {
    return res.status(403).json({ message: "Unauthorized to update flight" });
  }

  // Update flight
  try {
    const updatedFlight = await Flight.findByIdAndUpdate(
      id,
      { ...req.body, editedByAdmin: adminId },
      { new: true }
    );
    if (!updatedFlight) {
      return res.status(404).json({ message: "Flight not found" });
    }
    res.status(200).json({ flight: updatedFlight });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Delete a flight
export const deleteFlight = async (req, res, next) => {
  const id = req.params.id;

  const extractedToken = req.headers.authorization.split(" ")[1];
  if (!extractedToken && extractedToken.trim() === "") {
    return res.status(404).json({ message: "Token Not Found" });
  }

  let adminId;

  // Verify token
  jwt.verify(extractedToken, process.env.SECRET_KEY, (err, decrypted) => {
    if (err) {
      return res.status(400).json({ message: `${err.message}` });
    } else {
      adminId = decrypted.id;
    }
  });

  // Check if admin has permission to delete flight
  const adminUser = await Admin.findById(adminId);
  if (!adminUser) {
    return res.status(404).json({ message: "Admin not found" });
  }
  if (!adminUser.permissions.includes("DELETE")) {
    return res.status(403).json({ message: "Unauthorized to delete flight" });
  }

  // Delete flight
  try {
    const deletedFlight = await Flight.findByIdAndDelete(id);
    if (!deletedFlight) {
      return res.status(404).json({ message: "Flight not found" });
    }
    res.status(200).json({ message: "Flight deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

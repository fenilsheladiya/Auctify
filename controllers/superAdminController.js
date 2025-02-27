import mongoose from "mongoose";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Commission } from "../models/commissionSchema.js";
import { User } from "../models/userSchema.js";
import { Auction } from "../models/auctionSchema.js";
import { PaymentProof } from "../models/commissionProofSchema.js";

//delete auction
export const deleteAuctionItem = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorHandler("Invalid Id format.", 400));
    }
    const auctionItem = await Auction.findById(id);
    if (!auctionItem) {
      return next(new ErrorHandler("Auction not found.", 404));
    }
    await auctionItem.deleteOne();
    res.status(200).json({
      success: true,
      message: "Auction item deleted successfully.",
    });
  });

// get all payment
  export const getAllPaymentProofs = catchAsyncErrors(async (req, res, next) => {
    let paymentProofs = await PaymentProof.find();
    res.status(200).json({
      success: true,
      paymentProofs,
    });
  });

//get particular payment details
  export const getPaymentProofDetail = catchAsyncErrors(
    async (req, res, next) => {
      const { id } = req.params;
      const paymentProofDetail = await PaymentProof.findById(id);
      res.status(200).json({
        success: true,
        paymentProofDetail,
      });
    }
  );


  //update proof status
  export const updateProofStatus = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;
    const { amount, status } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorHandler("Invalid ID format.", 400));
    }
    let proof = await PaymentProof.findById(id);
    if (!proof) {
      return next(new ErrorHandler("Payment proof not found.", 404));
    }
    proof = await PaymentProof.findByIdAndUpdate(
      id,
      { status, amount },
      {
        new: true,
        runValidators: true,
        useFindAndModify: false,
      }
    );
    res.status(200).json({
      success: true,
      message: "Payment proof amount and status updated.",
      proof,
    });
  });


  //delete payment proof
  export const deletePaymentProof = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;
    const proof = await PaymentProof.findById(id);
    if (!proof) {
      return next(new ErrorHandler("Payment proof not found.", 404));
    }
    await proof.deleteOne();
    res.status(200).json({
      success: true,
      message: "Payment proof deleted.",
    });
  });
  
// Fetch all users, group them by month, year, and role, and return formatted statistics
export const fetchAllUsers = catchAsyncErrors(async (req, res, next) => {
  
    // Aggregate user data from the database, grouping them by month, year, and role
    const users = await User.aggregate([
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" }, // Extract month from createdAt field
            year: { $year: "$createdAt" },   // Extract year from createdAt field
            role: "$role",                   // Group by user role (e.g., Bidder, Auctioneer)
          },
          count: { $sum: 1 }, // Count total users in each group
        },
      },
      {
        $project: {
          month: "$_id.month", // Extract month from _id object
          year: "$_id.year",   // Extract year from _id object
          role: "$_id.role",   // Extract role from _id object
          count: 1,            // Keep the count field
          _id: 0,              // Exclude _id from final output
        },
      },
      {
        $sort: { year: 1, month: 1 }, // Sort results in ascending order by year and month
      },
    ]);
  
    // Filter users to separate bidders from auctioneers
    const bidders = users.filter((user) => user.role === "Bidder"); // Get only Bidders
    const auctioneers = users.filter((user) => user.role === "Auctioneer"); // Get only Auctioneers
  
    // Function to transform grouped user data into a monthly array
    const tranformDataToMonthlyArray = (data, totalMonths = 12) => {
      const result = Array(totalMonths).fill(0); // Initialize array with 12 months, all set to 0
  
      data.forEach((item) => {
        result[item.month - 1] = item.count; // Place count at the correct month index (0-based)
      });
  
      return result;
    };
  
    // Convert bidders and auctioneers data into monthly arrays
    const biddersArray = tranformDataToMonthlyArray(bidders);
    const auctioneersArray = tranformDataToMonthlyArray(auctioneers);
  
    // Send the response with formatted data
    res.status(200).json({
      success: true,
      biddersArray,      // Monthly distribution of bidders
      auctioneersArray,  // Monthly distribution of auctioneers
    });
});


//monthly revenue
  export const monthlyRevenue = catchAsyncErrors(async (req, res, next) => {
    const payments = await Commission.aggregate([
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);
  
    const tranformDataToMonthlyArray = (payments, totalMonths = 12) => {
      const result = Array(totalMonths).fill(0);
  
      payments.forEach((payment) => {
        result[payment._id.month - 1] = payment.totalAmount;
      });
  
      return result;
    };
  
    const totalMonthlyRevenue = tranformDataToMonthlyArray(payments);
    res.status(200).json({
      success: true,
      totalMonthlyRevenue,
    });
  });
  

import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { PaymentProof } from "../models/commissionProofSchema.js";
import { User } from "../models/userSchema.js";
import { Auction } from "../models/auctionSchema.js";
// import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import cloudinary from "cloudinary";
import { Commission } from "../models/commissionSchema.js";



// export const calculateCommission = async (auctionId) => {
//   const auction = await Auction.findById(auctionId);
//   if (!mongoose.Types.ObjectId.isValid(auctionId)) {
//     return next(new ErrorHandler("Invalid Auction Id format.", 400));
//   }
//   const commissionRate = 0.05;
//   const commission = auction.currentBid * commissionRate;
//   return commission;
// };

export const calculateCommission = async (auctionId) => {
  // Validate auction ID format
  if (!mongoose.Types.ObjectId.isValid(auctionId)) {
    throw new Error("Invalid Auction ID format.");
  }

  // Fetch auction details
  const auction = await Auction.findById(auctionId);
  if (!auction) {
    throw new Error("Auction not found.");
  }

  const commissionRate = 0.05; // 5% commission rate
  const commissionAmount = auction.currentBid * commissionRate;

  if (!commissionAmount || commissionAmount <= 0) {
    throw new Error("Invalid commission amount.");
  }

  // Save commission in the database
  const commissionEntry = await Commission.create({
    amount: commissionAmount,
    user: auction.createdBy, // The seller who owes commission
  });

  console.log(`✅ Commission calculated: ${commissionAmount} for auction ID: ${auctionId}`);

  return commissionEntry;
};



// export const proofOfCommission = catchAsyncErrors(async (req, res, next) => {
//     // Check if a file has been uploaded
//     if (!req.files || Object.keys(req.files).length === 0) {
//       return next(new ErrorHandler("Payment Proof Screenshot required.", 400));
//     }
  
//     // Extract the uploaded file (proof) and request body data (amount, comment)
//     const { proof } = req.files;
//     const { amount, comment } = req.body;
  
//     // Find the current logged-in user using their ID
//     const user = await User.findById(req.user._id);
  
//     // Ensure both amount and comment are provided, otherwise return an error
//     if (!amount || !comment) {
//       return next(
//         new ErrorHandler("Amount & comment are required fields.", 400)
//       );
//     }
  
//     // Check if the user has any unpaid commission
//     if (user.unpaidCommission === 0) {
//       return res.status(200).json({
//         success: true,
//         message: "You don't have any unpaid commissions.",
//       });
//     }
  
//     // Ensure the entered amount does not exceed the user's unpaid commission balance
//     if (user.unpaidCommission < amount) {
//       return next(
//         new ErrorHandler(
//           `The amount exceeds your unpaid commission balance. Please enter an amount up to ${user.unpaidCommission}`,
//           403
//         )
//       );
//     }
  
//     // Define allowed image formats for proof submission
//     const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
  
//     // Validate that the uploaded file format is supported
//     if (!allowedFormats.includes(proof.mimetype)) {
//       return next(new ErrorHandler("ScreenShot format not supported.", 400));
//     }
  
//     // Upload the proof image to Cloudinary storage
//     const cloudinaryResponse = await cloudinary.uploader.upload(
//       proof.tempFilePath,
//       {
//         folder: "MERN_AUCTION_PAYMENT_PROOFS",
//         api_key: process.env.CLOUDINARY_API_KEY,  // Add this if needed
//       }
//     );
  
//     // Check if there was an error during upload
//     if (!cloudinaryResponse || cloudinaryResponse.error) {
//       console.error(
//         "Cloudinary error:",
//         cloudinaryResponse.error || "Unknown cloudinary error."
//       );
//       return next(new ErrorHandler("Failed to upload payment proof.", 500));
//     }
  
//     // Save the proof details to the PaymentProof collection in the database
//     const commissionProof = await PaymentProof.create({
//       userId: req.user._id, // Associate the proof with the user who submitted it
//       proof: {
//         public_id: cloudinaryResponse.public_id, // Store Cloudinary file ID
//         url: cloudinaryResponse.secure_url, // Store Cloudinary file URL
//       },
//       amount, // Store the claimed commission amount
//       comment, // Store the comment provided by the user
//     });
  
//     // Send a success response with proof details
//     res.status(201).json({
//       success: true,
//       message:
//         "Your proof has been submitted successfully. We will review it and respond to you within 24 hours.",
//       commissionProof,
//     });
//   });
  


// ✅ Ensure Cloudinary is properly configured before using it
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const proofOfCommission = catchAsyncErrors(async (req, res, next) => {
  try {
    console.log("Received commission proof request...");

    // ✅ Check if a file has been uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      return next(new ErrorHandler("Payment Proof Screenshot required.", 400));
    }

    // ✅ Extract file and form data
    const { proof } = req.files;
    const { amount, comment } = req.body;

    console.log("Uploaded File:", proof);
    console.log("Amount:", amount, "Comment:", comment);

    // ✅ Find the current user
    const user = await User.findById(req.user._id);
    if (!user) return next(new ErrorHandler("User not found.", 404));

    // ✅ Validate amount and comment fields
    if (!amount || !comment) {
      return next(new ErrorHandler("Amount & comment are required fields.", 400));
    }

    // ✅ Validate unpaid commission
    if (user.unpaidCommission === 0) {
      return res.status(200).json({
        success: true,
        message: "You don't have any unpaid commissions.",
      });
    }
    if (user.unpaidCommission < amount) {
      return next(new ErrorHandler(
        `The amount exceeds your unpaid commission balance. Maximum allowed: ${user.unpaidCommission}`,
        403
      ));
    }

    // ✅ Validate file type
    const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedFormats.includes(proof.mimetype)) {
      return next(new ErrorHandler("Screenshot format not supported.", 400));
    }

    console.log("Uploading to Cloudinary...");

    // ✅ Upload to Cloudinary using v2
    const cloudinaryResponse = await cloudinary.v2.uploader.upload(proof.tempFilePath, {
      folder: "MERN_AUCTION_PAYMENT_PROOFS",
    });

    console.log("Cloudinary Upload Response:", cloudinaryResponse);

    // ✅ Ensure Cloudinary response is valid
    if (!cloudinaryResponse || cloudinaryResponse.error) {
      console.error("Cloudinary Upload Error:", cloudinaryResponse.error);
      return next(new ErrorHandler("Failed to upload payment proof.", 500));
    }

    // ✅ Save proof in database
    const commissionProof = await PaymentProof.create({
      userId: req.user._id,
      proof: {
        public_id: cloudinaryResponse.public_id,
        url: cloudinaryResponse.secure_url,
      },
      amount,
      comment,
    });

    console.log("Commission proof saved successfully.");

    // ✅ Send success response
    res.status(201).json({
      success: true,
      message: "Your proof has been submitted successfully. We will review it within 24 hours.",
      commissionProof,
    });

  } catch (error) {
    console.error("Error in proofOfCommission:", error);
    return next(new ErrorHandler(error.message, 500));
  }
});

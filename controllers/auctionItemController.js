import { Auction } from "../models/auctionSchema.js";
import { User } from "../models/userSchema.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import { Bid } from "../models/bidSchema.js";


//new auction create
// export const addNewAuctionItem = catchAsyncErrors(async (req, res, next) => {
//   if (!req.files || Object.keys(req.files).length === 0) {
//     return next(new ErrorHandler("Auction item image required.", 400));
//   }

//   const { image } = req.files;

//   const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
//   if (!allowedFormats.includes(image.mimetype)) {
//     return next(new ErrorHandler("File format not supported.", 400));
//   }

//   const {
//     title,
//     description,
//     category,
//     condition,
//     startingBid,
//     startTime,
//     endTime,
//   } = req.body;
//   if (
//     !title ||
//     !description ||
//     !category ||
//     !condition ||
//     !startingBid ||
//     !startTime ||
//     !endTime
//   ) {
//     return next(new ErrorHandler("Please provide all details.", 400));
//   }
//   if (new Date(startTime) < Date.now()) {
//     return next(
//       new ErrorHandler(
//         "Auction starting time must be greater than present time.",
//         400
//       )
//     );
//   }
//   if (new Date(startTime) >= new Date(endTime)) {
//     return next(
//       new ErrorHandler(
//         "Auction starting time must be less than ending time.",
//         400
//       )
//     );
//   }
//   const alreadyOneAuctionActive = await Auction.find({
//     createdBy: req.user._id,
//     endTime: { $gt: Date.now() },
//   });
//   if (alreadyOneAuctionActive.length > 0) {
//     return next(new ErrorHandler("You already have one active auction.", 400));
//   }
//   try {
//     const cloudinaryResponse = await cloudinary.uploader.upload(
//       image.tempFilePath,
//       {
//         folder: "MERN_AUCTION_PLATFORM_AUCTIONS",
//       }
//     );
//     if (!cloudinaryResponse || cloudinaryResponse.error) {
//       console.error(
//         "Cloudinary error:",
//         cloudinaryResponse.error || "Unknown cloudinary error."
//       );
//       return next(
//         new ErrorHandler("Failed to upload auction image to cloudinary.", 500)
//       );
//     }
//     const auctionItem = await Auction.create({
//       title,
//       description,
//       category,
//       condition,
//       startingBid,
//       startTime: new Date(startTime),  // Convert to Date      "startTime": "2025-02-20T10:00:00Z", 2025-02-20 → (YYYY-MM-DD) ⏰ 10:00:00 → (HH:MM:SS)
//       endTime: new Date(endTime),      // Convert to Date
//       image: {
//         public_id: cloudinaryResponse.public_id,
//         url: cloudinaryResponse.secure_url,
//       },
//       createdBy: req.user._id,
//     });
//     return res.status(201).json({
//       success: true,
//       message: `Auction item created and will be listed on auction page at ${startTime}`,
//       auctionItem,
//     });
//   } catch (error) {
//     return next(
//       new ErrorHandler(error.message || "Failed to created auction.", 500)
//     );
//   }
// });
export const addNewAuctionItem = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorHandler("Auction item image required.", 400));
  }

  const { image } = req.files;
  const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedFormats.includes(image.mimetype)) {
    return next(new ErrorHandler("File format not supported.", 400));
  }

  const {
    title,
    description,
    category,
    condition,
    startingBid,
    startTime,
    endTime,
  } = req.body;

  if (
    !title ||
    !description ||
    !category ||
    !condition ||
    !startingBid ||
    !startTime ||
    !endTime
  ) {
    return next(new ErrorHandler("Please provide all required details.", 400));
  }

  // ✅ Convert startTime and endTime to Date objects
  // ✅ Convert startTime and endTime to Date objects
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  const now = new Date(); // Current server time
  const currentUtcTime = new Date(Date.now()); // Ensuring UTC consistency

  // 🕒 Debugging: Log current server time
  console.log("🕒 Current Server UTC Time:", currentUtcTime.toISOString());
  console.log(
    `🔍 startTime Received: ${startTime}, Converted: ${startDate.toISOString()}`
  );

  // ✅ Validate Dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return next(
      new ErrorHandler(
        "Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SSZ).",
        400
      )
    );
  }

  // ✅ Ensure startTime is at least 1 minute in the future
  if (startDate.getTime() <= currentUtcTime.getTime()) {
    return next(
      new ErrorHandler(
        "Auction start time must be at least 1 minute in the future.",
        400
      )
    );
  }

  if (startDate.getTime() >= endDate.getTime()) {
    return next(
      new ErrorHandler("Auction start time must be before the end time.", 400)
    );
  }

  // ✅ Prevent overlapping auctions by the same user
  const overlappingAuction = await Auction.findOne({
    createdBy: req.user._id,
    $or: [
      { startTime: { $lt: endDate }, endTime: { $gt: startDate } }, // Overlapping time range
    ],
  });

  if (overlappingAuction) {
    return next(
      new ErrorHandler(
        "You already have an auction during this time period.",
        400
      )
    );
  }

  try {
    const cloudinaryResponse = await cloudinary.uploader.upload(
      image.tempFilePath,
      {
        folder: "MERN_AUCTION_PLATFORM_AUCTIONS",
      }
    );

    if (!cloudinaryResponse || cloudinaryResponse.error) {
      console.error(
        "Cloudinary error:",
        cloudinaryResponse.error || "Unknown cloudinary error."
      );
      return next(
        new ErrorHandler("Failed to upload auction image to Cloudinary.", 500)
      );
    }

    const auctionItem = await Auction.create({
      title,
      description,
      category,
      condition,
      startingBid,
      startTime: startDate, // ✅ Save as Date object
      endTime: endDate, // ✅ Save as Date object
      image: {
        public_id: cloudinaryResponse.public_id,
        url: cloudinaryResponse.secure_url,
      },
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: `Auction item created and will be listed on auction page at ${startDate.toISOString()}`,
      auctionItem,
    });
  } catch (error) {
    return next(
      new ErrorHandler(error.message || "Failed to create auction.", 500)
    );
  }
});

//all auction
export const getAllItems = catchAsyncErrors(async (req, res, next) => {
  let items = await Auction.find();
  res.status(200).json({
    success: true,
    items,
  });
});

//single auction details
export const getAuctionDetails = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Id format.", 400));
  }
  const auctionItem = await Auction.findById(id);
  if (!auctionItem) {
    return next(new ErrorHandler("Auction not found.", 404));
  }
  const bidders = auctionItem.bids.sort((a, b) => b.amount - a.amount);
  res.status(200).json({
    success: true,
    auctionItem,
    bidders,
  });
});

//only logined user items
export const getMyAuctionItems = catchAsyncErrors(async (req, res, next) => {
  const items = await Auction.find({ createdBy: req.user._id });
  res.status(200).json({
    success: true,
    items,
  });
});

//delete item
export const removeFromAuction = catchAsyncErrors(async (req, res, next) => {
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

//republish item
// export const republishItem = catchAsyncErrors(async (req, res, next) => {
//   const { id } = req.params;
//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     return next(new ErrorHandler("Invalid Id format.", 400));
//   }
//   let auctionItem = await Auction.findById(id);
//   if (!auctionItem) {
//     return next(new ErrorHandler("Auction not found.", 404));
//   }
//   if (!req.body.startTime || !req.body.endTime) {
//     return next(
//       new ErrorHandler("Starttime and Endtime for republish is mandatory.")
//     );
//   }
//   if (new Date(auctionItem.endTime) > Date.now()) {
//     return next(
//       new ErrorHandler("Auction is already active, cannot republish", 400)
//     );
//   }
//   let data = {
//     startTime: new Date(req.body.startTime),
//     endTime: new Date(req.body.endTime),
//   };
//   if (data.startTime < Date.now()) {
//     return next(
//       new ErrorHandler(
//         "Auction starting time must be greater than present time",
//         400
//       )
//     );
//   }
//   if (data.startTime >= data.endTime) {
//     return next(
//       new ErrorHandler(
//         "Auction starting time must be less than ending time.",
//         400
//       )
//     );
//   }

//   if (auctionItem.highestBidder) {
//     const highestBidder = await User.findById(auctionItem.highestBidder);
//     highestBidder.moneySpent -= auctionItem.currentBid;
//     highestBidder.auctionsWon -= 1;
//     highestBidder.save();
//   }

//   data.bids = [];
//   data.commissionCalculated = false;
//   data.currentBid = 0;
//   data.highestBidder = null;
//   auctionItem = await Auction.findByIdAndUpdate(id, data, {
//     new: true,
//     runValidators: true,
//     useFindAndModify: false,
//   });
//   await Bid.deleteMany({ auctionItem: auctionItem._id });
//   const createdBy = await User.findByIdAndUpdate(
//     req.user._id,
//     { unpaidCommission: 0 },
//     {
//       new: true,
//       runValidators: false,
//       useFindAndModify: false,
//     }
//   );
//   res.status(200).json({
//     success: true,
//     auctionItem,
//     message: `Auction republished and will be active on ${req.body.startTime}`,
//     createdBy,
//   });
// });


export const republishItem = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Id format.", 400));
  }

  let auctionItem = await Auction.findById(id);
  if (!auctionItem) {
    return next(new ErrorHandler("Auction not found.", 404));
  }

  if (!req.body.startTime || !req.body.endTime) {
    return next(new ErrorHandler("StartTime and EndTime for republish is mandatory.", 400));
  }

  if (new Date(auctionItem.endTime) > Date.now()) {
    return next(new ErrorHandler("Auction is already active, cannot republish.", 400));
  }

  let data = {
    startTime: new Date(req.body.startTime),
    endTime: new Date(req.body.endTime),
  };

  if (data.startTime < Date.now()) {
    return next(new ErrorHandler("Auction starting time must be in the future.", 400));
  }

  if (data.startTime >= data.endTime) {
    return next(new ErrorHandler("Auction start time must be earlier than end time.", 400));
  }

  // 🛑 **Fix: Prevent decreasing `auctionsWon` and `moneySpent` if auction was settled**
  if (auctionItem.highestBidder && !auctionItem.commissionCalculated) {
    const highestBidder = await User.findById(auctionItem.highestBidder);
    
    if (highestBidder) {
      console.log(`Rolling back highest bidder stats for ${highestBidder.userName}`);

      highestBidder.moneySpent = Math.max(0, highestBidder.moneySpent - auctionItem.currentBid);
      highestBidder.auctionsWon = Math.max(0, highestBidder.auctionsWon - 1);
      await highestBidder.save();
    }
  }

  // Reset auction properties
  data.bids = [];
  data.commissionCalculated = false;
  data.currentBid = 0;
  data.highestBidder = null;

  auctionItem = await Auction.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  // Remove only active bids, keep past data intact
  await Bid.deleteMany({ auctionItem: auctionItem._id });

  res.status(200).json({
    success: true,
    auctionItem,
    message: `Auction republished and will be active on ${req.body.startTime}`,
  });
});

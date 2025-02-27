import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Auction } from "../models/auctionSchema.js";
import { Bid } from "../models/bidSchema.js";
import { User } from "../models/userSchema.js";

export const placeBid = catchAsyncErrors(async (req, res, next) => {
    // Extract the auction item ID from the request parameters
    const { id } = req.params;
  
    // Find the auction item in the database using the provided ID
    const auctionItem = await Auction.findById(id);
    
    // If the auction item does not exist, return an error
    if (!auctionItem) {
      return next(new ErrorHandler("Auction Item not found.", 404));
    }
  
    // Extract the bid amount from the request body
    const { amount } = req.body;
  
    // If no bid amount is provided, return an error
    if (!amount) {
      return next(new ErrorHandler("Please place your bid.", 404));
    }
  
    // Ensure the bid amount is greater than the current highest bid
    if (amount <= auctionItem.currentBid) {
      return next(
        new ErrorHandler("Bid amount must be greater than the current bid.", 404)
      );
    }
  
    // Ensure the bid amount is at least as high as the starting bid
    if (amount < auctionItem.startingBid) {
      return next(
        new ErrorHandler("Bid amount must be greater than starting bid.", 404)
      );
    }
  
    try {
      // Check if the user has already placed a bid for this auction item
      const existingBid = await Bid.findOne({
        "bidder.id": req.user._id, // Find a bid by the same user
        auctionItem: auctionItem._id,
      });
  
      // Check if the user's bid already exists in the auctionItem's bid array
      const existingBidInAuction = auctionItem.bids.find(
        (bid) => bid.userId.toString() == req.user._id.toString()
      );
  
      if (existingBid && existingBidInAuction) {
        // If the user has already placed a bid, update the existing bid amount
        existingBidInAuction.amount = amount; // Update in the auctionItem bids array
        existingBid.amount = amount; // Update in the separate Bid collection
        
        // Save the updated bid details in the database
        await existingBidInAuction.save();
        await existingBid.save();
        
        // Update the highest bid in the auction item
        auctionItem.currentBid = amount;
      } else {
        // If the user is bidding for the first time, get their details
        const bidderDetail = await User.findById(req.user._id);
  
        // Create a new bid entry in the Bid collection
        const bid = await Bid.create({
          amount,
          bidder: {
            id: bidderDetail._id,
            userName: bidderDetail.userName,
            profileImage: bidderDetail.profileImage?.url,
          },
          auctionItem: auctionItem._id, // Link the bid to the auction item
        });
  
        // Add the new bid to the auction item's bid array
        auctionItem.bids.push({
          userId: req.user._id,
          userName: bidderDetail.userName,
          profileImage: bidderDetail.profileImage?.url,
          amount,
        });
  
        // Update the current highest bid in the auction item
        auctionItem.currentBid = amount;
      }
  
      // Save the updated auction item details
      await auctionItem.save();
  
      // Send a success response with the updated bid amount
      res.status(201).json({
        success: true,
        message: "Bid placed.",
        currentBid: auctionItem.currentBid,
      });
  
    } catch (error) {
      // If any error occurs, send an error response
      return next(new ErrorHandler(error.message || "Failed to place bid.", 500));
    }
  });
  

import cron from "node-cron";
import { Auction } from "../models/auctionSchema.js";
import { User } from "../models/userSchema.js";
import { Bid } from "../models/bidSchema.js";
import { sendEmail } from "../utils/sendEmail.js";
import { calculateCommission } from "../controllers/commissionProofController.js";



// export const endedAuctionCron = () => {
//   cron.schedule("*/1 * * * *", async () => {
//     console.log("🔄 Cron for ended auction running...");
//     const now = new Date();
//     console.log("📅 Current Time:", now);

//     const endedAuctions = await Auction.find({
//       endTime: { $lt: now },
//       commissionCalculated: false,
//     });

//     console.log("🔍 Found Auctions:", endedAuctions.length);

//     if (endedAuctions.length === 0) {
//       console.log("🚫 No auctions have ended yet.");
//       return;
//     }

//     for (const auction of endedAuctions) {
//       try {
//         console.log("\n🔹 Processing Auction:", auction.title);
//         console.log("Auction ID:", auction._id);

//         const commissionAmount = await calculateCommission(auction._id);
//         auction.commissionCalculated = true;

//         const highestBidder = await Bid.findOne({ auctionItem: auction._id })
//           .sort({ amount: -1 })
//           .limit(1);

//         console.log("🏆 Highest Bidder:", highestBidder);

//         if (!highestBidder) {
//           console.log("❌ No highest bidder found. Skipping...");
//           continue;
//         }

//         auction.highestBidder = highestBidder.bidder.id;
//         await auction.save();

//         console.log("✅ Auction updated with highest bidder.");

//         const auctioneer = await User.findById(auction.createdBy);
//         const bidder = await User.findById(highestBidder.bidder.id);

//         const subject = `Congratulations! You won the auction for ${auction.title}`;
//         const message = `Dear ${bidder.userName},\n\nCongratulations! You have won the auction for ${auction.title}.\n\nBefore proceeding with payment, contact your auctioneer via email: ${auctioneer.email}\n\nPayment Methods:\n1. **Bank Transfer**: \n- Account Name: ${auctioneer.paymentMethods.bankTransfer.bankAccountName} \n- Account Number: ${auctioneer.paymentMethods.bankTransfer.bankAccountNumber} \n- Bank: ${auctioneer.paymentMethods.bankTransfer.bankName}\n\n2. **PayPal**:\n- Send payment to: ${auctioneer.paymentMethods.paypal.paypalEmail}\n\n3. **Cash on Delivery (COD)**:\n- Pay 20% upfront via the above methods.\n- The remaining 80% will be paid on delivery.\n\nFor item verification, contact: ${auctioneer.email}\n\nBest regards,\nFenil Auction Team`;

//         console.log("📩 Sending email to highest bidder...");
//         await sendEmail({ email: bidder.email, subject, message });
//         console.log("✅ Email successfully sent to highest bidder.");
//       } catch (error) {
//         console.error("❌ Error in ended auction cron:", error);
//       }
//     }
//   });
// };

export const endedAuctionCron = () => {
  cron.schedule("*/1 * * * *", async () => {
    console.log("🔄 Cron for ended auction running...");
    const now = new Date();
    console.log("📅 Current Time:", now);

    const endedAuctions = await Auction.find({
      endTime: { $lt: now },
      commissionCalculated: false,
    });

    console.log("🔍 Found Auctions:", endedAuctions.length);

    if (endedAuctions.length === 0) {
      console.log("🚫 No auctions have ended yet.");
      return;
    }

    for (const auction of endedAuctions) {
      try {
        console.log("\n🔹 Processing Auction:", auction.title);
        console.log("Auction ID:", auction._id);

        // Find highest bidder first
        const highestBidder = await Bid.findOne({ auctionItem: auction._id })
          .sort({ amount: -1 })
          .limit(1);

        console.log("🏆 Highest Bidder:", highestBidder);

        // 🛑 **Fix: If no highest bidder, SKIP commission calculation**
        if (!highestBidder) {
          console.log(
            "❌ No highest bidder found. Skipping auction commission calculation..."
          );
          auction.commissionCalculated = true; // Mark it as processed
          await auction.save();
          continue;
        }

        // ✅ **Now safely calculate commission**
        const commissionAmount = await calculateCommission(auction._id);
        if (!commissionAmount || commissionAmount < 0) {
          console.log("❌ Commission calculation failed. Skipping auction...");
          continue;
        }

        auction.commissionCalculated = true;
        auction.highestBidder = highestBidder.bidder.id;
        await auction.save();

        console.log("✅ Auction updated with highest bidder.");

        // Fetch auctioneer and bidder details
        const auctioneer = await User.findById(auction.createdBy);
        const bidder = await User.findById(highestBidder.bidder.id);

        const subject = `Congratulations! You won the auction for ${auction.title}`;
        const message = `Dear ${bidder.userName},\n\nCongratulations! You have won the auction for ${auction.title}.\n\nBefore proceeding with payment, contact your auctioneer via email: ${auctioneer.email}\n\nPayment Methods:\n1. **Bank Transfer**: \n- Account Name: ${auctioneer.paymentMethods.bankTransfer.bankAccountName} \n- Account Number: ${auctioneer.paymentMethods.bankTransfer.bankAccountNumber} \n- Bank: ${auctioneer.paymentMethods.bankTransfer.bankName}\n\n2. **PayPal**:\n- Send payment to: ${auctioneer.paymentMethods.paypal.paypalEmail}\n\n3. **Cash on Delivery (COD)**:\n- Pay 20% upfront via the above methods.\n- The remaining 80% will be paid on delivery.\n\nFor item verification, contact: ${auctioneer.email}\n\nBest regards,\nFenil Auction Team`;

        console.log("📩 Sending email to highest bidder...");
        await sendEmail({ email: bidder.email, subject, message });
        console.log("✅ Email successfully sent to highest bidder.");
      } catch (error) {
        console.error("❌ Error in ended auction cron:", error);
      }
    }
  });
};

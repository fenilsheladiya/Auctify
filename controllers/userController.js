import { User } from "../models/userSchema.js";
import ErrorHandler from "../middlewares/error.js";
import { v2 as cloudinary } from "cloudinary";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import { generateToken } from "../utils/jwtToken.js";

export const register = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorHandler("Profile Image Required.", 400));
  }

  const { profileImage } = req.files;

  const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedFormats.includes(profileImage.mimetype)) {
    return next(new ErrorHandler("File format not supported.", 400));
  }

  const {
    userName,
    email,
    password,
    phone,
    address,
    role,
    bankAccountNumber,
    bankAccountName,
    bankName,
    paypalEmail,
  } = req.body;

  if (!userName || !email || !phone || !password || !address || !role) {
    return next(new ErrorHandler("Please fill full form.", 400));
  }
  if (role === "Auctioneer") {
    if (!bankAccountName || !bankAccountNumber || !bankName) {
      return next(
        new ErrorHandler("Please provide your full bank details.", 400)
      );
    }
    if (!paypalEmail) {
      return next(new ErrorHandler("Please provide your paypal email.", 400));
    }
  }
  const isRegistered = await User.findOne({ email });
  if (isRegistered) {
    return next(new ErrorHandler("User already registered.", 400));
  }
  const cloudinaryResponse = await cloudinary.uploader.upload(
    profileImage.tempFilePath,
    {
      folder: "MERN_AUCTION_PLATFORM_USERS",
    }
  );
  if (!cloudinaryResponse || cloudinaryResponse.error) {
    console.error(
      "Cloudinary error:",
      cloudinaryResponse.error || "Unknown cloudinary error."
    );
    return next(
      new ErrorHandler("Failed to upload profile image to cloudinary.", 500)
    );
  }
  const user = await User.create({
    userName,
    email,
    password,
    phone,
    address,
    role,
    profileImage: {
      public_id: cloudinaryResponse.public_id,
      url: cloudinaryResponse.secure_url,
    },
    paymentMethods: {
      bankTransfer: {
        bankAccountNumber,
        bankAccountName,
        bankName,
      },
      paypal: {
        paypalEmail,
      },
    },
  });

  generateToken(user, "User Registered.", 201, res);
});

//login
export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ErrorHandler("Please fill full form."));
  }
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid credentials.", 400));
  }
  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    return next(new ErrorHandler("Invalid credentials.", 400));
  }
  generateToken(user, "Login successfully.", 200, res);
});

//getprofile
export const getProfile = catchAsyncErrors(async (req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});

//logout
export const logout = catchAsyncErrors(async (req, res, next) => {
  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .json({
      success: true,
      message: "Logout Successfully.",
    });
});

//leaderboard
// export const fetchLeaderboard = catchAsyncErrors(async (req, res, next) => {
//     const users = await User.find({ moneySpent: { $gt: 0 } });
//     const leaderboard = users.sort((a, b) => b.moneySpent - a.moneySpent);
//     res.status(200).json({
//       success: true,
//       leaderboard,
//     });
//   });

// export const fetchLeaderboard = catchAsyncErrors(async (req, res, next) => {
//   try {
//     const users = await User.find({ moneySpent: { $gt: 0 } })
//       .sort({ moneySpent: -1 }) // Sorting directly in MongoDB
//       .select("userName moneySpent profileImage auctionsWon"); // Selecting only necessary fields

//     if (!users.length) {
//       return res.status(404).json({
//         success: false,
//         message: "No leaderboard data found",
//         leaderboard: [],
//       });
//     }

//     res.status(200).json({
//       success: true,
//       leaderboard: users,
//     });
//   } catch (error) {
//     console.error("Error fetching leaderboard:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// });

export const fetchLeaderboard = catchAsyncErrors(async (req, res, next) => {
  try {
    const users = await User.find({});
    console.log("All users:", users); // Log all users for debugging

    const leaderboardUsers = await User.find({ moneySpent: { $ne: 0 } });
    console.log("Filtered users:", leaderboardUsers); // Log filtered users

    if (!leaderboardUsers.length) {
      return res.status(404).json({
        success: false,
        message: "No leaderboard data found",
        leaderboard: [],
      });
    }

    const leaderboard = leaderboardUsers
      .sort((a, b) => b.moneySpent - a.moneySpent)
      .map(user => ({
        _id: user._id,
        userName: user.userName,
        moneySpent: user.moneySpent,
        profileImage: user.profileImage,
        auctionsWon: user.auctionsWon,
      }));

    res.status(200).json({
      success: true,
      leaderboard,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// import express from "express";
// import cors from "cors";
// import morgan from "morgan";
// import dotenv, { config } from "dotenv";
// import cloudinary from "cloudinary";
// import cookieParser from "cookie-parser";
// import fileUpload from "express-fileupload";
// import connectDb from "./config/connectDb.js";
// import { errorMiddleware } from "./middlewares/error.js";
// import userRouter from "./routes/userRoutes.js";
// import auctionItemRouter from "./routes/auctionItemRoutes.js";
// import bidRouter from "./routes/bidRoutes.js";
// import commissionRouter from "./routes/commissionRoutes.js";
// import superAdminRouter from "./routes/superAdminRoutes.js";
// import { endedAuctionCron } from "./automation/endedAuctionCron.js";
// import { verifyCommissionCron } from "./automation/verifyCommission.js";

// // Configure dotenv
// config({
//   path: "./config/config.env",
// });

// // Initialize express app
// const app = express();

// // Middlewares
// app.use(morgan("dev")); // Configure morgan
// app.use(express.json());
// app.use(cookieParser());
// app.use(cors());
// app.use(express.urlencoded({ extended: true }));
// app.use(
//   fileUpload({
//     useTempFiles: true,
//     tempFileDir: "/tmp/",
//   })
// );

// // Routes
// app.get("/", (req, res) => {
//   res.send("Hello from server!");
// });

// // Define port
// const PORT = process.env.PORT;

// cloudinary.v2.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// //cors
// // app.use(
// //   cors({
// //     origin: [process.env.FRONTEND_URL],
// //     methods: ["POST", "GET", "PUT", "DELETE"],
// //     credentials: true,
// //   })
// // );

// app.use(cors({ 
//   origin: "http://localhost:5173", // Explicitly allow frontend URL
//   credentials: true, // Allow cookies and authentication headers
//   methods: ["GET", "POST", "PUT", "DELETE"], // Allow specific methods
//   allowedHeaders: ["Content-Type", "Authorization"] // Allow necessary headers
// }));


// endedAuctionCron();
// verifyCommissionCron();
// connectDb();
// app.use(errorMiddleware);

// app.use("/api/v1/user", userRouter);
// app.use("/api/v1/auctionitem", auctionItemRouter);
// app.use("/api/v1/bid", bidRouter);
// app.use("/api/v1/commission", commissionRouter);
// app.use("/api/v1/superadmin", superAdminRouter);

// // Start server
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });


import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import connectDb from "./config/connectDb.js";
import { errorMiddleware } from "./middlewares/error.js";
import userRouter from "./routes/userRoutes.js";
import auctionItemRouter from "./routes/auctionItemRoutes.js";
import bidRouter from "./routes/bidRoutes.js";
import commissionRouter from "./routes/commissionRoutes.js";
import superAdminRouter from "./routes/superAdminRoutes.js";
import { endedAuctionCron } from "./automation/endedAuctionCron.js";
import { verifyCommissionCron } from "./automation/verifyCommission.js";
import path from "path";
import { fileURLToPath } from "url";


import cloudinary from "cloudinary";

// Configure dotenv
dotenv.config({ path: "./config/config.env" });

const app = express();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Apply CORS Middleware **BEFORE** Defining Routes
app.use(cors({
  origin: "http://localhost:5173", // Allow only frontend URL
  credentials: true, // Allow cookies and authorization headers
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"], // Allow required headers
}));


// Load environment variables
dotenv.config({ path: "./config/config.env" });

// ✅ Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "Missing",
  api_key: process.env.CLOUDINARY_API_KEY || "Missing",
  api_secret: process.env.CLOUDINARY_API_SECRET || "Missing",
});

// Debugging - Log Cloudinary Config
// console.log("Cloudinary Config:", {
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET ? "Loaded" : "Missing",
// });


// Middlewares
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({ useTempFiles: true, tempFileDir: "/tmp/" }));

// Routes (after applying CORS)
app.use("/api/v1/user", userRouter);
app.use("/api/v1/auctionitem", auctionItemRouter);
app.use("/api/v1/bid", bidRouter);
app.use("/api/v1/commission", commissionRouter);
app.use("/api/v1/superadmin", superAdminRouter);

endedAuctionCron();
verifyCommissionCron();
connectDb();

// Error Middleware
app.use(errorMiddleware);

//static file reading
app.use(express.static(path.join(__dirname, '/frontend/dist' )))

app.get('*', function(req,res){
  res.sendFile(path.join(__dirname, '/frontend/dist/index.html'));
});


// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import mongoose from "mongoose";

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL),
      console.log("DB connected Succesfully");
  } catch (error) {
    console.log(console.error);
  }
};

export default connectDb;

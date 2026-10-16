import mongoose from "mongoose";
import { User } from "../models/user.model";
import { Activity } from "../models/activity.model";

/** Conecta a MongoDB y espera a que existan los índices (el único de email, por ejemplo). */
export async function connectDb(uri: string): Promise<void> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([User.init(), Activity.init()]);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

import mongoose from "mongoose";
import * as Sentry from "@sentry/node";

require("dotenv").config({ quiet: true });

// MongoDB is optional, so anything that reads or writes data must check this first
export function enabled(): boolean {
    return !!process.env.database?.trim();
}

export default async () => {
    if(!enabled()) {
        // Without this mongoose queues queries until they time out instead of failing immediately
        mongoose.set("bufferCommands", false);

        console.log("No database configured, continuing without one.");
        return;
    }

    return mongoose.connect(process.env.database).then(() => {
        console.log("Connected to Database!");
    }).catch((err: Error) => {
        Sentry.captureException(err);
        console.error(err);

        process.exit(1);
    })
}

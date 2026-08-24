import ExtendedClient from "../classes/ExtendedClient";
import { REST, Routes } from "discord.js";

import fs from "fs";
import { enabled as databaseEnabled } from "../util/database";
import { getDirs } from "../util/functions";

require("dotenv").config({ quiet: true });

export default async function (client: ExtendedClient) {
    const commands: any[] = [];

    const rest = new REST({ version: "9" }).setToken(process.env.token);

    // Push Slash Commands
    await pushRoot();
    (await getDirs("./dist/commands")).forEach(dir => pushDir(dir));

    (async () => {
        try {
            console.log("Registering global commands...");

            const applicationCommands: any = await rest.put(Routes.applicationCommands(process.env.clientId), { body: commands });

            for(const command of applicationCommands) {
                client.commandIds.set(command.name, command.id);
            }

            console.log("Registered global commands!");
        } catch(err) {
            client.sentry.captureException(err);
            console.error(err);

            console.error("Failed to register global commands!");
        }
    })()

    // Slash Commands
    async function pushRoot() {
        const files = fs.readdirSync(`./dist/commands`).filter(file => file.endsWith(".js"));

        for(const file of files) {
            const command = require(`../commands/${file}`);
            if(command.enabled && !(command.database && !databaseEnabled())) commands.push(command);
        }
    }

    async function pushDir(dir: String) {
        const files = fs.readdirSync(`./dist/commands/${dir}`).filter(file => file.endsWith(".js"));

        for(const file of files) {
            const command = require(`../commands/${dir}/${file}`);
            if(command.enabled && !(command.database && !databaseEnabled())) commands.push(command);
        }
    }
}

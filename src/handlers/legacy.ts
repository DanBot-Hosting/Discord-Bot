import ExtendedClient from "../classes/ExtendedClient";
import { Message } from "discord.js";

import fs from "fs";
import { getDirs } from "../util/functions";

export = async (client: ExtendedClient) => {
    async function loadRoot() {
        const files = fs.readdirSync(`./dist/legacy`).filter((file: String) => file.endsWith(".js"));

        for(const file of files) {
            const command = require(`../legacy/${file}`);

            client.legacyCommands.set(command.name, command);

            console.log(`Loaded Legacy Command: ${command.name}`);
        }
    }

    async function loadDir(dir: String) {
        const files = fs.readdirSync(`./dist/legacy/${dir}`).filter((file: String) => file.endsWith(".js"));

        for(const file of files) {
            const command = require(`../legacy/${dir}/${file}`);

            client.legacyCommands.set(command.name, command);

            console.log(`Loaded Legacy Command: ${command.name}`);
        }
    }

    await loadRoot();
    (await getDirs("./dist/legacy")).forEach((dir: String) => loadDir(dir));

    client.logLegacyError = async function (err: Error, message: Message, Discord: typeof import("discord.js")) {
        const id = client.sentry.captureException(err);
        console.error(err);

        const error = new Discord.EmbedBuilder()
            .setColor(client.config_embeds.error)
            .setTitle("💥 An error occurred")
            .setDescription(`\`\`\`${err.message}\`\`\``)
            .addFields (
                { name: "Error ID", value: id }
            )
            .setTimestamp()

        message.reply({ embeds: [error] });
    }

    require("dotenv").config({ quiet: true });
}

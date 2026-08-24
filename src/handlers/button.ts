import ExtendedClient from "../classes/ExtendedClient";
import { ButtonInteraction, MessageFlags, EmbedBuilder } from "discord.js";

import fs from "fs";
import { getDirs } from "../util/functions";

export = async (client: ExtendedClient) => {
    async function loadRoot() {
        const files = fs.readdirSync(`./dist/buttons`).filter((file: String) => file.endsWith(".js"));

        for(const file of files) {
            const button = require(`../buttons/${file}`);

            client.buttons.set(button.name, button);

            console.log(`Loaded Button: ${button.name}`);
        }
    }

    async function loadDir(dir: String) {
        const files = fs.readdirSync(`./dist/buttons/${dir}`).filter((file: String) => file.endsWith(".js"));

        for(const file of files) {
            const button = require(`../buttons/${dir}/${file}`);

            client.buttons.set(button.name, button);

            console.log(`Loaded Button: ${button.name}`);
        }
    }

    await loadRoot();
    (await getDirs("./dist/buttons")).forEach((dir: String) => loadDir(dir));

    client.logButtonError = async function (err: Error, interaction: ButtonInteraction, Discord: typeof import("discord.js")) {
        const id = client.sentry.captureException(err);
        console.error(err);

        const error = new EmbedBuilder()
            .setColor(client.config_embeds.error)
            .setTitle("💥 An error occurred")
            .setDescription(`\`\`\`${err.message}\`\`\``)
            .addFields (
                { name: "Error ID", value: id }
            )
            .setTimestamp()

        interaction.deferred || interaction.replied ? await interaction.editReply({ embeds: [error] }) : await interaction.reply({ embeds: [error], flags: MessageFlags.Ephemeral });
    }

    require("dotenv").config({ quiet: true });
}

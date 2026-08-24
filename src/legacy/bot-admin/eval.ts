import LegacyCommand from "../../classes/LegacyCommand";
import ExtendedClient from "../../classes/ExtendedClient";
import { Message } from "discord.js";

import cap from "../../util/plainCap";
import { emojis as emoji } from "../../config";

const command: LegacyCommand = {
    name: "eval",
    description: "Evaluate code on the bot.",
    aliases: [],
    botPermissions: [],
    requiredRoles: ["botAdmin"],
    cooldown: 0,
    enabled: true,
    async execute(message: Message, args: string[], cmd: LegacyCommand, client: ExtendedClient, Discord: typeof import("discord.js")) {
        try {
            if(!args[0]) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} No code was provided.`)

                message.reply({ embeds: [error] });
                return;
            }

            console.log(`[eval] [input] ${message.author.tag} (${message.author.id}): ${args.join(" ")}`);

            const evalInput = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setTitle("📥 Input")
                .setDescription(`\`\`\`js\n${cap(args.join(" "), 4000)}\`\`\``)
                .setTimestamp()

            const evaluating = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`${emoji.ping} Evaluating...`)

            const msg = await message.reply({ embeds: [evaluating] });

            try {
                // Run the code
                let output: string = await eval(args.join(" "));

                if(output !== null && output !== undefined) {
                    output = output.toString();

                    // Censor the database URL, Sentry DSN and bot token if they are returned
                    if(output.includes(process.env.database) && process.env.database) output = output.replace(process.env.database, "[CENSORED_DATABASE_URL]");
                    if(output.includes(process.env.sentry_dsn) && process.env.sentry_dsn) output = output.replace(process.env.sentry_dsn, "[CENSORED_SENTRY_DSN]");
                    if(output.includes(process.env.token) && process.env.token) output = output.replace(process.env.token, "[CENSORED_BOT_TOKEN]");

                    console.log(`[eval] [output] ${message.author.tag} (${message.author.id}):\n` + output);

                    const evalOutput = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.default)
                        .setTitle("📤 Output")
                        .setDescription(`\`\`\`js\n${cap(output, 4000)}\`\`\``)
                        .setTimestamp()

                    msg.edit({ embeds: [evalInput, evalOutput] });
                } else {
                    console.log(`[eval] [output] ${message.author.tag} (${message.author.id}):\n` + output);

                    const evalOutput = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.error)
                        .setTitle("📤 Output")
                        .setDescription("No output was returned.")
                        .setTimestamp()

                    msg.edit({ embeds: [evalInput, evalOutput] });
                }
            } catch(err) {
                // Censor the database URL, Sentry DSN and bot token if they are returned
                if(process.env.database && err.message.includes(process.env.database)) err.message = err.message.replace(process.env.database, "[CENSORED_MONGODB_URI]");
                if(process.env.sentry_dsn && err.message.includes(process.env.sentry_dsn)) err.message = err.message.replace(process.env.sentry_dsn, "[CENSORED_SENTRY_DSN]");
                if(process.env.token && err.message.includes(process.env.token)) err.message = err.message.replace(process.env.token, "[CENSORED_BOT_TOKEN]");

                console.log(`[eval] [error] ${message.author.tag} (${message.author.id}):\n` + err);

                const evalOutput = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setTitle("📤 Output")
                    .setDescription(`\`\`\`js\n${cap(err.message, 4000)}\`\`\``)
                    .setTimestamp()

                msg.edit({ embeds: [evalInput, evalOutput] });
            }
        } catch(err) {
            client.logLegacyError(err, message, Discord);
        }
    }
}

export = command;

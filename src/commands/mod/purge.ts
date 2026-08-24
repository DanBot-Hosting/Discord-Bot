import Command from "../../classes/Command";
import ExtendedClient from "../../classes/ExtendedClient";
import { ChatInputCommandInteraction, PermissionFlagsBits, TextChannel } from "discord.js";

import { emojis as emoji } from "../../config";

const command: Command = {
    name: "purge",
    description: "Purge messages in a channel.",
    options: [
        {
            type: 4,
            name: "amount",
            description: "The amount of messages to purge.",
            min_value: 2,
            max_value: 100,
            required: true
        },

        {
            type: 6,
            name: "user",
            description: "Purge messages sent by a specific user.",
            required: false
        }
    ],
    default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
    botPermissions: [],
    requiredRoles: [],
    cooldown: 10,
    enabled: true,
    deferReply: true,
    ephemeral: true,
    async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient, Discord: typeof import("discord.js")) {
        try {
            const amount = interaction.options.get("amount").value as number;
            const user = interaction.options.getUser("user");

            const fetching = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`${emoji.ping} Fetching messages...`)

            await interaction.editReply({ embeds: [fetching] });

            let messages = await interaction.channel.messages.fetch({ limit: amount, before: interaction.id });;

            if(user) messages = messages.filter(message => message.author.id === user.id);

            if(messages.size === 0) {
                const noMessages = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} No messages found.`)

                await interaction.editReply({ embeds: [noMessages] });
                return;
            }

            const found = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`${emoji.ping} Purging ${messages.size} message${messages.size === 1 ? "" : "s"}...`)

            await interaction.editReply({ embeds: [found] });

            // Delete the messages
            const result = await interaction.channel.bulkDelete(messages, true);

            if(result.size === 0) {
                const noDeleted = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.default)
                    .setDescription(`${emoji.cross} No messages were deleted.`)

                await interaction.editReply({ embeds: [noDeleted] });
                return;
            }

            const deleted = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`${emoji.tick} Deleted ${result.size} message${messages.size === 1 ? "" : "s"}.`)

            await interaction.editReply({ embeds: [deleted] });

            // Generate output
            const output = [];

            for(const messageId of result.keys()) {
                // bulkDelete() returns partials for messages that are not cached, so prefer the fetched message
                const message = messages.get(messageId) ?? result.get(messageId);

                if(!message) continue;

                const createdAt = message.createdAt.toUTCString();
                const author = message.author?.tag ?? "Unknown user";
                const id = message.author?.id ?? "unknown";
                const embeds = message.embeds?.length ?? 0;
                const attachments = message.attachments?.size ?? 0;
                const content = message.content || "";

                output.push(`[${createdAt}] ${author} (${id}) [${embeds} embed${embeds === 1 ? "" : "s"}, ${attachments} attachment${attachments === 1 ? "" : "s"}]: ${content}`);
            }

            output.reverse();

            // Generate result file
            const file = Buffer.from(output.join("\n"));
            const attachment = new Discord.AttachmentBuilder(file, { name: `purge-${Date.now()}.txt` });

            const log = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ extension: "png", forceStatic: false }), url: `https://discord.com/users/${interaction.user.id}` })
                .setTitle("Purge")
                .addFields (
                    { name: "Channel", value: `${interaction.channel}`, inline: true },
                    { name: "Messages", value: `${result.size}`, inline: true }
                )
                .setTimestamp()

            if(user) log.addFields({ name: "User", value: `${user}`, inline: true });

            const channel = client.channels.cache.get(client.config_channels.modLogs) as TextChannel;

            channel.send({ embeds: [log], files: output.length ? [attachment] : [] });
        } catch(err) {
            client.logCommandError(err, interaction, Discord);
        }
    }
}

export = command;

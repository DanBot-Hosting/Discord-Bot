import Command from "../../classes/Command";
import ExtendedClient from "../../classes/ExtendedClient";
import { ChatInputCommandInteraction, TextChannel } from "discord.js";

import { emojis as emoji } from "../../config";
import formatCurrency from "../../util/formatCurrency";

const command: Command = {
    name: "credit",
    description: "Manage user credit amounts.",
    options: [
        {
            type: 1,
            name: "add",
            description: "Add credit to a user.",
            options: [
                {
                    type: 6,
                    name: "user",
                    description: "The user to add credit to.",
                    required: true
                },

                {
                    type: 4,
                    name: "amount",
                    description: "The amount of credit to add.",
                    min_value: 1,
                    max_value: 10000,
                    required: true
                }
            ]
        },

        {
            type: 1,
            name: "fix",
            description: "Fix a user's credit amount.",
            options: [
                {
                    type: 6,
                    name: "user",
                    description: "The user who's credit amount to fix.",
                    required: true
                }
            ]
        },

        {
            type: 1,
            name: "remove",
            description: "Remove credit from a user.",
            options: [
                {
                    type: 6,
                    name: "user",
                    description: "The user to remove credit from.",
                    required: true
                },

                {
                    type: 4,
                    name: "amount",
                    description: "The amount of credit to remove.",
                    min_value: 1,
                    required: true
                }
            ]
        },

        {
            type: 1,
            name: "set",
            description: "Set a user's credit amount.",
            options: [
                {
                    type: 6,
                    name: "user",
                    description: "The user who's credit amount to set.",
                    required: true
                },

                {
                    type: 4,
                    name: "amount",
                    description: "The amount of servers to set the user's credit amount to.",
                    min_value: 0,
                    max_value: 10000,
                    required: true
                }
            ]
        },
    ],
    default_member_permissions: null,
    botPermissions: ["ManageRoles"],
    requiredRoles: ["admin"],
    cooldown: 5,
    enabled: true,
    database: true,
    deferReply: true,
    ephemeral: false,
    async execute(interaction: ChatInputCommandInteraction & any, client: ExtendedClient, Discord: typeof import("discord.js")) {
        try {
            const user = interaction.options.getUser("user");

            if(user.bot) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} Only users can have credit!`)

                await interaction.editReply({ embeds: [error] });
                return;
            }

            if(interaction.options.getSubcommand() === "add") {
                const amount = interaction.options.get("amount").value as number;

                try {
                    await client.credit.add(user.id, amount, client);
                } catch(err) {
                    console.error(err);
                    const error = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.error)
                        .setDescription(`${emoji.cross} ${err.message}`)

                    await interaction.editReply({ embeds: [error] });
                    return;
                }

                const added = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.default)
                    .setDescription(`${emoji.tick} Added **${formatCurrency(amount)}** of credit to ${user}!`)

                await interaction.editReply({ embeds: [added] });

                try {
                    const donation = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.default)
                        .setDescription(`💖 Thank you ${user} for donating **${formatCurrency(amount)}**!`)

                    const channel = await client.channels.fetch(client.config_channels.donations) as TextChannel;

                    await channel.send({ embeds: [donation] });
                } catch {}

                return;
            }

            if(interaction.options.getSubcommand() === "fix") {
                const oldData = await client.credit.get(user.id);
                const newCount = await client.credit.fix(user.id);

                if(oldData.used === newCount) {
                    const error = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.default)
                        .setDescription(`${emoji.tick} ${user}'s credit amount is correct!`)

                    await interaction.editReply({ embeds: [error], ephemeral: true });
                    return;
                }

                const fixed = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.default)
                    .setDescription(`${emoji.tick} ${user}'s credit amount has been fixed!`)

                await interaction.editReply({ embeds: [fixed] });
                return;
            }

            if(interaction.options.getSubcommand() === "remove") {
                const amount = interaction.options.get("amount").value as number;

                try {
                    await client.credit.remove(user.id, amount, client);
                } catch(err) {
                    const error = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.error)
                        .setDescription(`${emoji.cross} ${err.message}`)

                    await interaction.editReply({ embeds: [error] });
                    return;
                }

                const removed = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.default)
                    .setDescription(`${emoji.tick} Removed **${formatCurrency(amount)}** of credit from ${user}!`)

                await interaction.editReply({ embeds: [removed] });
                return;
            }

            if(interaction.options.getSubcommand() === "set") {
                const amount = interaction.options.get("amount").value as number;

                try {
                    await client.credit.set(user.id, amount, client);
                } catch(err) {
                    const error = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.error)
                        .setDescription(`${emoji.cross} ${err.message}`)

                    await interaction.editReply({ embeds: [error] });
                    return;
                }

                const set = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.default)
                    .setDescription(`${emoji.tick} ${user}'s credit amount has been set to **${formatCurrency(amount)}**.`)

                await interaction.editReply({ embeds: [set] });
                return;
            }
        } catch(err) {
            client.logCommandError(err, interaction, Discord);
        }
    }
}

export = command;

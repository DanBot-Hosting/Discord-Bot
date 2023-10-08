import Command from "../../classes/Command";
import ExtendedClient from "../../classes/ExtendedClient";
import { CommandInteraction, PermissionFlagsBits, TextChannel } from "discord.js";

import { emojis as emoji } from "../../config";

const command: Command = {
    name: "mute",
    description: "Mute a user.",
    options: [
        {
            type: 6,
            name: "user",
            description: "The user to mute.",
            required: true
        },

        {
            type: 3,
            name: "time",
            description: "The time to mute the user for.",
            choices: [
                {
                    name: "1 minute",
                    value: "1m"
                },

                {
                    name: "5 minutes",
                    value: "5m"
                },

                {
                    name: "10 minutes",
                    value: "10m"
                },

                {
                    name: "30 minutes",
                    value: "30m"
                },

                {
                    name: "1 hour",
                    value: "1h"
                },

                {
                    name: "6 hours",
                    value: "6h"
                },

                {
                    name: "12 hours",
                    value: "12h"
                },

                {
                    name: "1 day",
                    value: "1d"
                },

                {
                    name: "3 days",
                    value: "3d"
                },

                {
                    name: "1 week",
                    value: "1w"
                }
            ],
            required: true
        },

        {
            type: 3,
            name: "reason",
            description: "The reason for muting the user.",
            min_length: 3,
            max_length: 250,
            required: true
        }
    ],
    default_member_permissions: PermissionFlagsBits.ModerateMembers.toString(),
    botPermissions: ["ModerateMembers"],
    requiredRoles: [],
    cooldown: 15,
    enabled: true,
    deferReply: true,
    ephemeral: true,
    async execute(interaction: CommandInteraction, client: ExtendedClient, Discord: typeof import("discord.js")) {
        try {
            const user = interaction.options.getUser("user");
            const time = interaction.options.get("time").value as string;
            const reason = interaction.options.get("reason").value as string;

            const author = interaction.guild.members.cache.get(interaction.user.id);
            const member = interaction.guild.members.cache.get(user.id);

            if(!member) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} ${member} is not in the server!`)

                await interaction.editReply({ embeds: [error] });
                return;
            }

            if(member.id === interaction.user.id) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} You cannot mute yourself!`)

                await interaction.editReply({ embeds: [error] });
                return;
            }

            if(member.user.bot) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} You cannot mute bots!`)

                await interaction.editReply({ embeds: [error] });
                return;
            }

            if(member.roles.highest.position >= interaction.guild.members.me.roles.highest.position || member.permissions.has("Administrator")) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} I cannot mute ${member}!`)

                await interaction.editReply({ embeds: [error] });
                return;
            }

            if(member.roles.highest.position >= author.roles.highest.position) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} You cannot mute ${member}!`)

                await interaction.editReply({ embeds: [error] });
                return;
            }

            // Convert time to milliseconds
            let timeMs: number;

            if(time.endsWith("m")) timeMs = parseInt(time.slice(0, -1)) * 60000;
            if(time.endsWith("h")) timeMs = parseInt(time.slice(0, -1)) * 3600000;
            if(time.endsWith("d")) timeMs = parseInt(time.slice(0, -1)) * 86400000;
            if(time.endsWith("w")) timeMs = parseInt(time.slice(0, -1)) * 604800000;

            // Timeout member
            const timeout = await member.timeout(timeMs, `${interaction.user.tag.endsWith("#0") ? interaction.user.username : interaction.user.tag} (${interaction.user.id}): ${reason}`);

            // Reply to interaction
            const muted = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`${emoji.tick} Muted ${member} until <t:${timeout.communicationDisabledUntilTimestamp.toString().slice(0, -3)}:f>!`)

            await interaction.editReply({ embeds: [muted] });

            // Log
            const logChannel = interaction.guild.channels.cache.get(client.config_channels.modLogs) as TextChannel;

            const log = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setAuthor({ name: interaction.user.tag.endsWith("#0") ? interaction.user.username : interaction.user.tag, iconURL: interaction.user.avatarURL({ extension: "png", forceStatic: false }), url: `https://discord.com/users/${interaction.user.id}`})
                .setTitle("Member Muted")
                .addFields (
                    { name: "User", value: `${user} **|** \`${user.id}\`` },
                    { name: "Reason", value: reason },
                    { name: "Duration", value: `${time}` },
                    { name: "Expires", value: `<t:${timeout.communicationDisabledUntilTimestamp.toString().slice(0, -3)}:f>` }
                )
                .setTimestamp()

            await logChannel.send({ embeds: [log] });
        } catch(err) {
            client.logCommandError(err, interaction, Discord);
        }
    }
}

export = command;
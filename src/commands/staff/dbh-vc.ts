import Command from "../../classes/Command";
import ExtendedClient from "../../classes/ExtendedClient";
import { CommandInteraction, PermissionFlagsBits, VoiceChannel } from "discord.js";

import { emojis as emoji } from "../../config";

const command: Command = {
    name: "dbh-vc",
    description: "Manage the discord.gg/dbh voice channel.",
    options: [
        {
            type: 1,
            name: "lock",
            description: "Lock the discord.gg/dbh voice channel."
        },

        {
            type: 1,
            name: "unlock",
            description: "Unlock the discord.gg/dbh voice channel."
        }
    ],
    default_member_permissions: PermissionFlagsBits.ManageChannels.toString(),
    botPermissions: ["ManageChannels", "ManageRoles"],
    requiredRoles: [],
    cooldown: 10,
    enabled: true,
    deferReply: true,
    ephemeral: false,
    async execute(interaction: CommandInteraction & any, client: ExtendedClient, Discord: typeof import("discord.js")) {
        try {
            const voiceChannel = await client.channels.fetch(client.config_channels.voice.dbh) as VoiceChannel;

            if(interaction.options.getSubcommand() === "lock") {
                const locking = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.default)
                    .setDescription(`${emoji.ping} Locking <#${client.config_channels.voice.dbh}>...`);

                await interaction.editReply({ embeds: [locking] });

                await voiceChannel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });

                const locked = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.default)
                    .setDescription(`${emoji.tick} Locked <#${client.config_channels.voice.dbh}>!`);

                await interaction.editReply({ embeds: [locked] });
                return;
            }

            if(interaction.options.getSubcommand() === "unlock") {
                const unlocking = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.default)
                    .setDescription(`${emoji.ping} Unlocking <#${client.config_channels.voice.dbh}>...`);

                await interaction.editReply({ embeds: [unlocking] });

                await voiceChannel.permissionOverwrites.edit(interaction.guild.id, { Connect: true });

                const unlocked = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.default)
                    .setDescription(`${emoji.tick} Unlocked <#${client.config_channels.voice.dbh}>!`);

                await interaction.editReply({ embeds: [unlocked] });
                return;
            }
        } catch(err) {
            client.logCommandError(err, interaction, Discord);
        }
    }
}

export = command;
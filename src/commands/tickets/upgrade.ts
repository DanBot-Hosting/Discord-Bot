import Command from "../../classes/Command";
import ExtendedClient from "../../classes/ExtendedClient";
import { CommandInteraction, TextChannel } from "discord.js";

import { emojis as emoji } from "../../config";
import getRoles from "../../functions/roles/get";

const command: Command = {
    name: "upgrade",
    description: "Make a ticket only accessible to administrators.",
    options: [],
    default_member_permissions: null,
    botPermissions: ["ManageChannels", "ManageRoles"],
    requiredRoles: ["staff"],
    cooldown: 120,
    enabled: true,
    deferReply: true,
    ephemeral: true,
    async execute(interaction: CommandInteraction, client: ExtendedClient, Discord: typeof import("discord.js")) {
        try {
            // Check if the command is being used in a ticket channel
            if(!interaction.channel.name.startsWith("🎫╏")) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} This command can only be used in a ticket channel!`)

                await interaction.editReply({ embeds: [error] });
                return;
            }

            const channel = interaction.channel as TextChannel;
            const userRoles = await getRoles(interaction.user.id, client);

            if(channel.topic !== interaction.user.id && !userRoles.staff) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} You cannot upgrade another user's ticket!`)

                await interaction.editReply({ embeds: [error] });
                return;
            }

            const upgrading = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`${emoji.ping} Upgrading ticket...`)

            await interaction.editReply({ embeds: [upgrading] });

            if(channel.permissionOverwrites.cache.has(client.config_roles.admin)) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} This ticket is already admin-only!`)

                await interaction.editReply({ embeds: [error] });
                return;
            }

            await channel.permissionOverwrites.delete(client.config_roles.staff);
            await channel.permissionOverwrites.create(client.config_roles.admin, { ViewChannel: true });

            const adminOnlyMessage = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription("⏫ This ticket is now only visible to administrators.")

            await channel.send({ embeds: [adminOnlyMessage] });

            const success = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`${emoji.tick} This ticket is now only visible to administrators.`)

            await interaction.editReply({ embeds: [success] });
        } catch(err) {
            client.logCommandError(err, interaction, Discord);
        }
    }
}

export = command;

import Command from "../../classes/Command";
import ExtendedClient from "../../classes/ExtendedClient";
import { CommandInteraction, TextChannel } from "discord.js";

import { emojis as emoji } from "../../config";
import getRoles from "../../functions/roles/get";

const command: Command = {
    name: "remove",
    description: "Remove a user from your ticket.",
    options: [
        {
            type: 6,
            name: "user",
            description: "The user to remove from your ticket.",
            required: true
        }
    ],
    default_member_permissions: null,
    botPermissions: ["ManageChannels", "ManageRoles"],
    requiredRoles: [],
    cooldown: 15,
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
                    .setDescription(`${emoji.cross} You cannot update another user's ticket!`)

                await interaction.editReply({ embeds: [error] });
                return;
            }

            const user = interaction.options.getUser("user");
            const member = interaction.guild.members.cache.get(user.id);

            if(!member) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} ${user} is not in the server!`)

                await interaction.editReply({ embeds: [error] });
                return;
            }

            if(!channel.permissionOverwrites.cache.has(user.id)) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} ${user} is not in this ticket!`)

                await interaction.editReply({ embeds: [error] });
                return;
            }

            await channel.permissionOverwrites.delete(user.id);

            const removedUser = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`${user} has been removed from the ticket.`)

            await channel.send({ embeds: [removedUser] });

            const removed = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`${emoji.tick} ${user} has been removed from the ticket!`)

            await interaction.editReply({ embeds: [removed] });
        } catch(err) {
            client.logCommandError(err, interaction, Discord);
        }
    }
}

export = command;

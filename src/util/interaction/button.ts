import ExtendedClient from "../../classes/ExtendedClient";
import { ButtonInteraction, MessageFlags } from "discord.js";

import Button from "../../classes/Button";

import Roles, { Role } from "../../classes/Roles";
import { emojis as emoji } from "../../config";
import getRoles from "../../functions/roles/get";
import { noPermissionButton } from "../embeds";

export = async (client: ExtendedClient, Discord: typeof import("discord.js"), interaction: ButtonInteraction) => {
    try {
        const button: Button = client.buttons.get(interaction.customId);
        const userRoles: Roles = await getRoles(interaction.user.id, client);

        if(button) {
            const requiredRoles: Role[] = button.requiredRoles;

            if(requiredRoles.length && !userRoles.botAdmin) {
                const hasRoles = [];

                for(const role of requiredRoles) {
                    if(userRoles[role]) hasRoles.push(role);
                }

                if(requiredRoles.length !== hasRoles.length) return await interaction.reply({ embeds: [noPermissionButton], flags: MessageFlags.Ephemeral });
            }

            try {
                // Log interaction to console
                console.log(`[interactionCreate] [button] ${interaction.user.tag} (${interaction.user.id}): ${interaction.customId}`);

                await button.execute(interaction, client, Discord);
            } catch(err) {
                client.logError(err);

                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} There was an error while executing that button!`)

                await interaction.reply({ embeds: [error], flags: MessageFlags.Ephemeral });
            }

            return;
        }

        for(const btn of client.buttons) {
            if(interaction.customId.startsWith(btn[0]) && btn[1].startsWith) {
                const requiredRoles: Role[] = btn[1].requiredRoles;

                if(requiredRoles.length && !userRoles.botAdmin) {
                    const hasRoles = [];

                    for(const role of requiredRoles) {
                        if(userRoles[role]) hasRoles.push(role);
                    }

                    if(requiredRoles.length !== hasRoles.length) return await interaction.reply({ embeds: [noPermissionButton], flags: MessageFlags.Ephemeral });
                }

                try {
                    // Log interaction to console
                    console.log(`[interactionCreate] [button] ${interaction.user.tag} (${interaction.user.id}): ${interaction.customId}`);

                    await btn[1].execute(interaction, client, Discord);
                } catch(err) {
                    client.logError(err);

                    const error = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.error)
                        .setDescription(`${emoji.cross} There was an error while executing that button!`)

                    await interaction.reply({ embeds: [error], flags: MessageFlags.Ephemeral });
                }

                break;
            }
        }
    } catch(err) {
        client.logError(err);
    }
}

import Command from "../../classes/Command";
import ExtendedClient from "../../classes/ExtendedClient";
import { ChatInputCommandInteraction, PermissionFlagsBits, TextChannel } from "discord.js";

import { emojis as emoji } from "../../config";

import User from "../../models/User";

const command: Command = {
    name: "assign-donator-role",
    description: "Ensure all donators have the donator role.",
    options: [],
    default_member_permissions: PermissionFlagsBits.ManageRoles.toString(),
    botPermissions: ["ManageRoles"],
    requiredRoles: ["admin"],
    cooldown: 10,
    enabled: true,
    database: true,
    deferReply: true,
    ephemeral: false,
    async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient, Discord: typeof import("discord.js")) {
        try {
            // Return if the comand is not being used in the primary guild
            if(interaction.guild.id !== client.config_main.primaryGuild) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} This command can only be used in the primary guild.`)

                await interaction.editReply({ embeds: [error] });
                return;
            }

            const fetching = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`${emoji.ping} Fetching users...`)

            const i = await interaction.editReply({ embeds: [fetching] });

            const roleChanges = [];

            const data = await User.find({ credit_amount: { $gt: 0 } });
            const zeroData = await User.find({ credit_amount: 0 });

            const assigning = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`${emoji.ping} Assigning roles...`)

            await i.edit({ embeds: [assigning] });

            for(const user of data) {
                const member = await interaction.guild.members.fetch(user._id).catch((): null => null);

                if(!member) continue;

                if(!member.roles.cache.has(client.config_roles.donator)) {
                    await member.roles.add(client.config_roles.donator);
                    roleChanges.push(`+ ${member.user.username} (${member.user.id})`);
                }
            }

            for(const user of zeroData) {
                const member = await interaction.guild.members.fetch(user._id).catch((): null => null);

                if(!member) continue;

                if(member.roles.cache.has(client.config_roles.donator)) {
                    await member.roles.remove(client.config_roles.donator);
                    roleChanges.push(`- ${member.user.username} (${member.user.id})`);
                }
            }

            if(!roleChanges.length) {
                const result = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} No role changes were made.`)

                await i.edit({ embeds: [result] });
                return;
            }

            const additions = roleChanges.filter(r => r.startsWith("+"));
            const removals = roleChanges.filter(r => r.startsWith("-"));

            const fileContent = `${additions.length ? `Additions:\n${additions.join("\n")}` : ""}${removals.length ? `${additions.length ? "\n" : ""}Removals:\n${removals.join("\n")}` : ""}`;
            const buffer = Buffer.from(fileContent, "utf-8");

            const file = new Discord.AttachmentBuilder(buffer, { name: "result.txt" });

            await i.edit({ embeds: [], files: [file] });

            // Send log to donator logs
            const channel = interaction.guild.channels.cache.get(client.config_channels.donatorLogs) as TextChannel;

            const log = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ extension: "png", forceStatic: false }), url: `https://discord.com/users/${interaction.user.id}` })
                .setTitle("Donator Role Assignment")
                .setTimestamp()

            if(roleChanges.length) {
                await channel.send({ embeds: [log], files: [file] });
            }
        } catch(err) {
            client.logCommandError(err, interaction, Discord);
        }
    }
}

export = command;

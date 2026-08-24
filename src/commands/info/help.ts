import Command from "../../classes/Command";
import ExtendedClient from "../../classes/ExtendedClient";
import { ChatInputCommandInteraction } from "discord.js";

import Roles, { Role } from "../../classes/Roles";

import { emojis as emoji } from "../../config";
import { enabled as databaseEnabled } from "../../util/database";
import fs from "fs";
import { getDirs } from "../../util/functions";
import getRoles from "../../functions/roles/get";

const command: Command = {
    name: "help",
    description: "Displays a list of all my commands.",
    options: [
        {
            type: 3,
            name: "command",
            description: "Get info on a specific command.",
            required: false
        }
    ],
    default_member_permissions: null,
    botPermissions: [],
    requiredRoles: [],
    cooldown: 5,
    enabled: true,
    deferReply: true,
    ephemeral: true,
    async execute(interaction: ChatInputCommandInteraction & any, client: ExtendedClient, Discord: typeof import("discord.js")) {
        try {
            const cmd: any = interaction.options.get("command")?.value;

            const commands: string[] = [];

            const userRoles: Roles = await getRoles(interaction.user.id, client);

            async function pushRoot() {
                const files = fs.readdirSync(`./dist/commands`).filter(file => file.endsWith(".js"));

                for(const file of files) {
                    const command = require(`../${file}`);

                    if(command.name) {
                        if(!command.enabled) continue;
                        if(command.database && !databaseEnabled()) continue;

                        if(command.default_member_permissions) {
                            if(!interaction.member.permissions.has(command.default_member_permissions)) continue;
                        }

                        const requiredRoles: Role[] = command.requiredRoles;

                        if(requiredRoles.length) {
                            const hasRoles = [];

                            for(const role of requiredRoles) {
                                if(userRoles[role]) hasRoles.push(role);
                            }

                            if(requiredRoles.length !== hasRoles.length) continue;
                        }

                        commands.push(command.name);
                    } else {
                        continue;
                    }
                }
            }

            async function pushDir(dir: String) {
                const files = fs.readdirSync(`./dist/commands/${dir}`).filter(file => file.endsWith(".js"));

                for(const file of files) {
                    const command = require(`../${dir}/${file}`);

                    if(command.name) {
                        if(!command.enabled) continue;
                        if(command.database && !databaseEnabled()) continue;

                        if(command.default_member_permissions) {
                            if(!interaction.member.permissions.has(command.default_member_permissions)) continue;
                        }

                        const requiredRoles: Role[] = command.requiredRoles;

                        if(requiredRoles.length) {
                            const hasRoles = [];

                            for(const role of requiredRoles) {
                                if(userRoles[role]) hasRoles.push(role);
                            }

                            if(requiredRoles.length !== hasRoles.length) continue;
                        }

                        commands.push(command.name);
                    } else {
                        continue;
                    }
                }
            }

            await pushRoot();
            (await getDirs("./dist/commands")).forEach(dir => pushDir(dir));

            const cmds = [];

            for(const cmd of commands) {
                const info = client.commands.get(cmd);

                cmds.push(`</${cmd}:${client.commandIds.get(cmd)}>\n${emoji.reply} ${info.description}`);
            }

            const help = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setThumbnail(client.user.displayAvatarURL({ extension: "png", forceStatic: false }))
                .setTitle("Commands")
                .setDescription(cmds.sort().join("\n"))
                .setTimestamp()

            // If a command was specified, get info on that command
            const command = client.commands.get(cmd);

            if(command) {
                if(!command.enabled) return await interaction.editReply({ embeds: [help] });
                if(command.database && !databaseEnabled()) return await interaction.editReply({ embeds: [help] });

                const description = command.description ?? "N/A";
                const botPermissions = command.botPermissions.length ? `\`${command.botPermissions.join("\`, \`")}\`` : "N/A";
                const cooldown = command.cooldown ? `${command.cooldown} second${command.cooldown === 1 ? "" : "s"}` : "None";

                const commandHelp = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.default)
                    .setTitle(`Command: ${command.name}`)
                    .addFields (
                        { name: "Description", value: description },
                        { name: "Cooldown", value: cooldown },
                        { name: "Bot Permissions", value: botPermissions }
                    )
                    .setTimestamp()

                await interaction.editReply({ embeds: [commandHelp] });
                return;
            }

            await interaction.editReply({ embeds: [help] });
        } catch(err) {
            client.logCommandError(err, interaction, Discord);
        }
    }
}

export = command;

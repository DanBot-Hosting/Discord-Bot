import Event from "../../classes/Event";
import ExtendedClient from "../../classes/ExtendedClient";
import { ChannelType, Message, PermissionResolvable, TextChannel } from "discord.js";

import LegacyCommand from "../../classes/LegacyCommand";

import cap from "../../util/cap";
import { Role } from "../../classes/Roles";
import { channels, emojis as emoji, main } from "../../config";
import getRoles from "../../functions/roles/get";
import { noPermissionCommand } from "../../util/embeds";

const cooldowns = new Map();

const event: Event = {
    name: "messageCreate",
    once: false,
    async execute(client: ExtendedClient, Discord: typeof import("discord.js"), message: Message) {
        try {
            // Required permissions for the bot to function
            const requiredPerms: PermissionResolvable = ["SendMessages", "EmbedLinks"];

            // If the message is from a bot, ignore the message
            if(message.author.bot) return;

            const userRoles = await getRoles(message.author.id, client);

            // Send message to channel through the bot's DMs
            if(message.channel.type === ChannelType.DM) {
                // Log the message to the console
                console.log(`[DM] [messageCreate] ${message.author.tag} (${message.author.id}): ${message.content}`);

                if(userRoles.botAdmin) {
                    const args = message.content.trim().split(/ +/g);

                    if(!args[1]) return message.reply("Please provide the message you would like to send.");

                    try {
                        const channel = client.channels.cache.get(args[0]) as TextChannel;

                        if(!channel) return message.reply("Please provide a valid channel ID.");

                        const msg = await channel.send({ content: cap(message.content.split(" ").slice(1).join(" "), 2000), allowedMentions: { parse: [] } });

                        // Message successfully sent
                        message.reply(msg.url);
                    } catch(err) {
                        // Message failed to send
                        message.reply(`\`\`\`${err.message}\`\`\``);
                    }
                }

                return;
            }

            // If the message wasn't sent in a guild or is not the primary guild, ignore the message
            if(!message.guild || message.guild.id !== main.primaryGuild) return;
            // If the bot doesn't have the required permissions, ignore the message
            if(!message.guild.members.me.permissions.has(requiredPerms)) return;

            // Anti-raid
            // Ban members who mention 15 or more users in a message, excluding staff members
            if(message.mentions.members.size >= 15 && !userRoles.staff) {
                if(!message.guild.members.me.permissions.has(["BanMembers"])) return;

                await message.member.ban({ reason: "Mentioning 15 or more users in a message." });

                const channel = message.guild.channels.cache.get(channels.modLogs) as TextChannel;

                const banned = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.default)
                    .setTitle("🔨 Banned")
                    .setDescription(`You have been banned from **${message.guild.name}**!`)
                    .addFields (
                        { name: "Reason", value: "Mentioning 15 or more users in a message." },
                        { name: "Appeal", value: `Email **${main.appealEmail}** with your ban reason and why you should be unbanned.` }
                    )
                    .setTimestamp()

                let sentDM = false;

                try {
                    await message.author.send({ embeds: [banned] });
                    sentDM = true;
                } catch {}

                const banLog = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.default)
                    .setTitle("Member Banned")
                    .addFields (
                        { name: "User", value: `${message.author} **|** \`${message.author.id}\`` },
                        { name: "Reason", value: "Mentioning 15 or more users in a message." },
                        { name: "User Notified", value: sentDM ? emoji.tick : emoji.cross }
                    )
                    .setTimestamp()

                channel.send({ embeds: [banLog] });
                return;
            }

            // Auto crosspost messages
            if(main.autoCrosspost.includes(message.channel.id) && message.crosspostable && !message.content.startsWith(">")) return await message.crosspost();

            // React to messages in the suggestion channels
            if(main.suggestionReactions && main.suggestionChannels.includes(message.channel.id) && !message.content.startsWith(">")) {
                await message.react("👍");
                await message.react("👎");
                return;
            }

            const args = message.content.slice(main.legacyPrefix.length).split(/ +/);

            const cmd = args.shift().toLowerCase();
            const command: LegacyCommand = client.legacyCommands.get(cmd) || client.legacyCommands.find((c: LegacyCommand) => c.aliases && c.aliases.includes(cmd));

            // Prefix command deprecation
            if(!command && message.content.toLowerCase().startsWith(main.legacyPrefix.toLowerCase()) && message.content.length >= main.legacyPrefix.length + 4) {
                const description = [
                    `👋 Hey there, **${message.author.globalName || message.author.username}**!`,
                    `\nIn the recent rewrite of the DBH Discord bot we have decided to move away from prefix commands (e.g. \`${main.legacyPrefix}help\`) and have moved to slash commands (e.g. </help:${client.commandIds.get("help")}>).`,
                    "\nThis change has been made to help make development easier of the Discord bot and allow us to maintain it easily.",
                    "\nRegards,",
                    "The **DanBot Team**"
                ]

                const legacy = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.default)
                    .setTitle("Deprecation of Prefix Commands")
                    .setDescription(description.join("\n"))

                message.reply({ embeds: [legacy] });
                return;
            }

            if(!command) return;

            const requiredRoles: Role[] = command.requiredRoles;

            if(requiredRoles.length && !userRoles.botAdmin) {
                const hasRoles = [];

                for(const role of requiredRoles) {
                    if(userRoles[role]) hasRoles.push(role);
                }

                if(requiredRoles.length !== hasRoles.length) return message.reply({ embeds: [noPermissionCommand] });
            }

            if(!command.enabled) {
                const disabled = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} This command has been disabled!`)

                message.reply({ embeds: [disabled] });
                return;
            }

            const validPermissions = client.validPermissions;

            if(command.botPermissions.length) {
                const invalidPerms = [];

                for(const perm of command.botPermissions as any) {
                    if(!validPermissions.includes(perm)) return;

                    if(!message.guild.members.me.permissions.has(perm)) invalidPerms.push(perm);
                }

                if(invalidPerms.length) {
                    const permError = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.error)
                        .setDescription(`I am missing these permissions: \`${invalidPerms.join("\`, \`")}\``)

                    message.reply({ embeds: [permError] });
                    return;
                }
            }

            if(userRoles.owner || userRoles.botAdmin) {
                // Log the message to the console
                console.log(`[messageCreate] ${message.author.tag} (${message.author.id}): ${message.content}`);

                try {
                    await command.execute(message, args, cmd, client, Discord);
                    return;
                } catch(err) {
                    client.logError(err);
    
                    const error = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.error)
                        .setDescription(`${emoji.cross} There was an error while executing that command!`)
    
                    message.reply({ embeds: [error] });
                    return;
                }
            }

            if(!cooldowns.has(command.name)) cooldowns.set(command.name, new Discord.Collection());

            const currentTime = Date.now();
            const timeStamps = cooldowns.get(command.name);
            const cooldownAmount = command.cooldown * 1000;

            if(timeStamps.has(message.author.id)) {
                const expirationTime = timeStamps.get(message.author.id) + cooldownAmount;

                if(currentTime < expirationTime) {
                    const timeLeft: string = (((expirationTime - currentTime) / 1000).toFixed(0)).toString();

                    const cooldown = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.error)
                        .setDescription(`⏰ Please wait ${timeLeft} second${timeLeft === "1" ? "" : "s"} before running that command again!`)

                    message.reply({ embeds: [cooldown] });
                    return;
                }
            }

            timeStamps.set(message.author.id, currentTime);

            setTimeout(() => {
                timeStamps.delete(message.author.id);
            }, cooldownAmount)

            try {
                // Log the message to the console
                console.log(`[messageCreate] ${message.author.tag} (${message.author.id}): ${message.content}`);

                await command.execute(message, args, cmd, client, Discord);
            } catch(err) {
                client.logError(err);

                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} There was an error while executing that command!`)

                message.reply({ embeds: [error] });
            }
        } catch(err) {
            client.logError(err);
        }
    }
}

export = event;

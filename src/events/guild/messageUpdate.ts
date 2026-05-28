import Event from "../../classes/Event";
import ExtendedClient from "../../classes/ExtendedClient";
import { Message, PermissionResolvable, TextChannel } from "discord.js";

import cap from "../../util/cap";
import { channels, main } from "../../config";

const event: Event = {
    name: "messageUpdate",
    once: false,
    async execute(client: ExtendedClient & any, Discord: typeof import("discord.js"), oldMessage: Message, newMessage: Message) {
        try {
            const requiredPerms: PermissionResolvable = ["SendMessages", "EmbedLinks"];

            // Ignore messages not in the primary guild and partial messages
            if(!oldMessage.guild || oldMessage.partial || newMessage.partial) return;
            if(oldMessage.guild.id !== main.primaryGuild) return;
            // Ignore messages that are sent by bots
            if(oldMessage.author.bot) return;
            // Ignore messages if the bot does not have the required permissions
            if(!oldMessage.guild.members.me.permissions.has(requiredPerms)) return;
            // Return if the message is in an ignored channel
            if(main.logIgnoredChannels.includes(oldMessage.channel.id)) return;

            const channel = oldMessage.guild.channels.cache.get(channels.messageLogs) as TextChannel;

            const messageInfo = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.displayAvatarURL({ extension: "png", forceStatic: false }), url: `https://discord.com/users/${oldMessage.author.id}` })
                .setTitle("Message Edited")
                .addFields (
                    { name: "Channel", value: `${oldMessage.channel}`, inline: true },
                    { name: "Message Sent", value: `<t:${oldMessage.createdTimestamp.toString().slice(0, -3)}:f>`, inline: true },
                    { name: "Message ID", value: `\`${oldMessage.id}\``, inline: true },
                    { name: "Attachments", value: `**${oldMessage.attachments.size}** > **${newMessage.attachments.size}**`, inline: true },
                    { name: "Embeds", value: `**${oldMessage.embeds.length}** > **${newMessage.embeds.length}**`, inline: true },
                    { name: "Stickers", value: `**${oldMessage.stickers.size}** > **${newMessage.stickers.size}**`, inline: true }
                )
                .setTimestamp()

            const oldContent = oldMessage.content || "*No content.*";
            const newContent = newMessage.content || "*No content.*";

            const embeds = [messageInfo];
            const files = [];

            if (oldContent !== newContent) {
                if (oldContent.length + newContent.length > 5000) {
                    files.push(
                        new Discord.AttachmentBuilder(Buffer.from(oldContent), { name: "oldMessage.txt" }),
                        new Discord.AttachmentBuilder(Buffer.from(newContent), { name: "newMessage.txt" })
                    );
                } else {
                    const oldLog = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.default)
                        .setTitle("Old Message")
                        .setDescription(oldContent);

                    const newLog = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.default)
                        .setTitle("New Message")
                        .setDescription(newContent);
                        
                    embeds.push(oldLog, newLog);
                }
            }

            const buttons: any = new Discord.ActionRowBuilder()
                .addComponents (
                    new Discord.ButtonBuilder()
                        .setStyle(Discord.ButtonStyle.Link)
                        .setLabel("Jump to Message")
                        .setURL(oldMessage.url)
                )

            await channel.send({ embeds, files, components: [buttons] });
        } catch(err) {
            client.logError(err);
        }
    }
}

export = event;

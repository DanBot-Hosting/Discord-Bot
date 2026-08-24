import Event from "../../classes/Event";
import ExtendedClient from "../../classes/ExtendedClient";
import { GuildPremiumTier, Message, PermissionResolvable, TextChannel } from "discord.js";

import { channels, main, starboard } from "../../config";
import cap from "../../util/cap";

// Maximum size of a single upload, in bytes, for each boost tier
const uploadLimits: Record<GuildPremiumTier, number> = {
    [GuildPremiumTier.None]: 10485760,
    [GuildPremiumTier.Tier1]: 10485760,
    [GuildPremiumTier.Tier2]: 52428800,
    [GuildPremiumTier.Tier3]: 104857600
};

const event: Event = {
    name: "messageDelete",
    once: false,
    async execute(client: ExtendedClient & any, Discord: typeof import("discord.js"), message: Message) {
        try {
            const requiredPerms: PermissionResolvable = ["SendMessages", "EmbedLinks"];

            // Ignore messages not in the primary guild, partial messages
            if(!message.guild || message.partial) return;
            if(message.guild.id !== main.primaryGuild) return;

            const channel = message.guild.channels.cache.get(channels.messageLogs) as TextChannel;

            const log = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ extension: "png", forceStatic: false }), url: `https://discord.com/users/${message.author.id}` })
                .setTitle("Message Deleted")
                .addFields (
                    { name: "Channel", value: `${message.channel}`, inline: true },
                    { name: "Message Sent", value: `<t:${message.createdTimestamp.toString().slice(0, -3)}:f>`, inline: true },
                    { name: "Message ID", value: `\`${message.id}\``, inline: true },
                    { name: "Attachments", value: `${message.attachments.size}`, inline: true },
                    { name: "Embeds", value: `${message.embeds.length}`, inline: true },
                    { name: "Stickers", value: `${message.stickers.size}`, inline: true }
                )
                .setTimestamp()

            if(message.content) log.setDescription(cap(message.content, 4000));

            if(!main.logIgnoredChannels.includes(message.channel.id)) {
                const canAttach = channel.permissionsFor(message.guild.members.me)?.has("AttachFiles") ?? false;
                const uploadLimit = uploadLimits[message.guild.premiumTier] ?? uploadLimits[GuildPremiumTier.None];

                const attachments = canAttach ? [...message.attachments.values()].filter(attachment => attachment.size <= uploadLimit) : [];
                const files: InstanceType<typeof Discord.AttachmentBuilder>[] = [];

                for(const attachment of attachments) {
                    // Handed a URL, discord.js fetches it without checking the status, so a
                    // purged attachment would be re-uploaded as the CDN's error page
                    const res = await fetch(attachment.url);
                    if(!res.ok) continue;

                    files.push(new Discord.AttachmentBuilder(Buffer.from(await res.arrayBuffer()), { name: attachment.name }));
                }

                // Anything the bot could not re-upload is noted on the embed instead
                const skipped = message.attachments.size - files.length;

                if(skipped > 0) log.addFields({ name: "Not Re-uploaded", value: `${skipped}`, inline: true });

                // A failed upload should never cost us the log entry itself
                try {
                    await channel.send({ embeds: [log], files });
                } catch(err) {
                    if(files.length < 1) throw err;
                    await channel.send({ embeds: [log] });
                }
            }

            // Ignore messages if the bot does not have the required permissions
            if(!message.guild.members.me.permissions.has(requiredPerms)) return;

            // Delete starboard message if it exists
            // Return if the message is one week old
            if(message.createdTimestamp < Date.now() - 604800000) return;

            // Return if the message is in the starboard channel or in a channel that is not allowed
            if(message.channel.id === channels.starboard || !starboard.allowed.includes(message.channel.id)) return;

            // Return if there is no message content or attachments
            if(!message.content && message.attachments.size < 1) return;

            const starboardChannel = message.guild.channels.cache.get(channels.starboard) as TextChannel;

            const messages = await starboardChannel.messages.fetch({ limit: 100 });
            const starMessage = messages.find(msg => msg.author.id === client.user.id && msg?.embeds?.length === 1 && msg.embeds[0]?.footer?.text === `ID: ${message.id}`);

            if(starMessage) await starMessage.delete();
        } catch(err) {
            client.logError(err);
        }
    }
}

export = event;

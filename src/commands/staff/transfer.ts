import Command from "../../classes/Command";
import ExtendedClient from "../../classes/ExtendedClient";
import { ChatInputCommandInteraction, MessageFlags, TextChannel } from "discord.js";

import { emojis as emoji } from "../../config";
import formatCurrency from "../../util/formatCurrency";

import User from "../../models/User";

const command: Command = {
    name: "transfer",
    description: "Transfer user data to another account.",
    options: [
        {
            type: 6,
            name: "from",
            description: "The user who's data to move.",
            required: true
        },

        {
            type: 6,
            name: "to",
            description: "The account to move it to.",
            required: true
        }
    ],
    default_member_permissions: null,
    botPermissions: ["ManageRoles"],
    requiredRoles: ["staff"],
    cooldown: 10,
    enabled: true,
    database: true,
    deferReply: true,
    ephemeral: false,
    async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient, Discord: typeof import("discord.js")) {
        try {
            const fetching = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`${emoji.ping} Fetching users...`)

            const i = await interaction.editReply({ embeds: [fetching] });

            const from = interaction.options.getUser("from");
            const to = interaction.options.getUser("to");

            const checkingUsers = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`${emoji.ping} Verifying users...`)

            await i.edit({ embeds: [checkingUsers] });

            if(from.id === to.id) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} The sending and receiving users cannot be the same!`)

                await i.edit({ embeds: [error] });
                return;
            }

            if(from.bot || to.bot) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} You can only transfer data between users!`)

                await i.edit({ embeds: [error] });
                return;
            }

            const fromGuildMember = interaction.guild.members.cache.get(from.id);
            const toGuildMember = interaction.guild.members.cache.get(to.id);

            if(!fromGuildMember) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} ${from} is not in this server!`)

                await i.edit({ embeds: [error] });
                return;
            }

            if(!toGuildMember) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} ${to} is not in this server!`)

                await i.edit({ embeds: [error] });
                return;
            }

            // TODO: Verify both have the same console accounts linked

            const verifyingTransfer = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`${emoji.ping} Verifying transfer...`)

            await i.edit({ embeds: [verifyingTransfer] });

            let fromUser = await User.findOne({ _id: from.id });
            let toUser = await User.findOne({ _id: to.id }) || new User({ _id: to.id, credit_amount: 0, credit_used: 0 });

            if(!fromUser) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} ${from} has no data to be transferred!`)

                await i.edit({ embeds: [error] });
                return;
            }

            const confirm = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setTitle("Transfer Data")
                .setDescription(`Are you sure you want to transfer all data associated with ${from} to ${to}?`)
                .addFields (
                    { name: "What will be transferred?", value: `✨ **${formatCurrency(fromUser.credit_amount)}** credit` }
                )
                .setFooter({ text: "This prompt will expire in 30 seconds." })

            const actions: any = new Discord.ActionRowBuilder()
                .addComponents (
                    new Discord.ButtonBuilder()
                        .setStyle(Discord.ButtonStyle.Secondary)
                        .setCustomId(`confirm-${interaction.id}`)
                        .setEmoji(emoji.dbh_check),

                    new Discord.ButtonBuilder()
                        .setStyle(Discord.ButtonStyle.Secondary)
                        .setCustomId(`cancel-${interaction.id}`)
                        .setEmoji(emoji.dbh_cross)
                )

            await i.edit({ embeds: [confirm], components: [actions] });

            const collector = interaction.channel.createMessageComponentCollector({ componentType: Discord.ComponentType.Button, time: 30000 });

            collector.on("collect", async c => {
                if(c.user.id !== interaction.user.id) {
                    const error = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.error)
                        .setDescription(`${emoji.cross} This button is not for you!`)

                    c.reply({ embeds: [error], flags: MessageFlags.Ephemeral });
                    return;
                }

                if(c.customId === `confirm-${interaction.id}`) {
                    collector.stop();

                    const creditTransfer = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.default)
                        .setDescription(`${emoji.ping} Transferring credit...`)

                    await i.edit({ embeds: [creditTransfer], components: [] });

                    toUser.credit_amount += fromUser.credit_amount;
                    toUser.credit_used += fromUser.credit_used;

                    await toUser.save();

                    const deleting = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.default)
                        .setDescription(`${emoji.ping} Deleting old data...`)

                    await i.edit({ embeds: [deleting] });

                    await fromUser.deleteOne();

                    const assigningRoles = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.default)
                        .setDescription(`${emoji.ping} Assigning roles...`)

                    await i.edit({ embeds: [assigningRoles] });

                    if(fromGuildMember.roles.cache.get(client.config_roles.donator)) {
                        await fromGuildMember.roles.remove(client.config_roles.donator);
                    }

                    if(toUser.credit_amount > 0 && !toGuildMember.roles.cache.get(client.config_roles.donator)) {
                        await toGuildMember.roles.add(client.config_roles.donator);
                    }

                    const transferred = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.default)
                        .setDescription(`${emoji.tick} All data associated with ${from} has been transferred to ${to}!`)

                    await i.edit({ embeds: [transferred] });

                    const log = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.default)
                        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ extension: "png", forceStatic: false }), url: `https://discord.com/users/${interaction.user.id}` })
                        .setTitle("Data Transfer")
                        .addFields (
                            { name: "From", value: `${from} **|** \`${from.id}\`` },
                            { name: "To", value: `${to} **|** \`${to.id}\`` }
                        )
                        .setTimestamp()

                    const dataLog = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.default)
                        .addFields (
                            { name: "✨ Credit", value: `**${formatCurrency(fromUser.credit_amount)}**` }
                        )

                    const channel = client.channels.cache.get(client.config_channels.accountLogs) as TextChannel;

                    channel.send({ embeds: [log, dataLog] });
                    return;
                }

                if(c.customId === `cancel-${interaction.id}`) {
                    collector.stop();

                    const cancelled = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.error)
                        .setDescription(`${emoji.cross} Operation cancelled.`)

                    await i.edit({ embeds: [cancelled], components: [] });
                    return;
                }
            })

            collector.on("end", async collected => {
                let validInteractions = [];

                collected.forEach(c => {
                    if(c.user.id === interaction.user.id) validInteractions.push(c);
                })

                if(validInteractions.length == 0) {
                    const cancelled = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.error)
                        .setDescription(`${emoji.cross} Operation cancelled.`)

                    await i.edit({ embeds: [cancelled], components: [] });
                }
            })
        } catch(err) {
            client.logCommandError(err, interaction, Discord);
        }
    }
}

export = command;

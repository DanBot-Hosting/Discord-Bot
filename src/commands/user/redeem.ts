import Command from "../../classes/Command";
import ExtendedClient from "../../classes/ExtendedClient";
import { ChatInputCommandInteraction, TextChannel } from "discord.js";
import CodeDrop from "../../classes/CodeDrop";

import { emojis as emoji } from "../../config";
import formatCurrency from "../../util/formatCurrency";

import User from "../../models/User";

const command: Command = {
    name: "redeem",
    description: "Redeem a code from a code drop.",
    options: [
        {
            type: 3,
            name: "code",
            description: "The name of the code which to redeem.",
            min_length: 5,
            max_length: 32,
            required: true
        }
    ],
    default_member_permissions: null,
    botPermissions: ["ManageRoles"],
    requiredRoles: [],
    cooldown: 10,
    enabled: true,
    database: true,
    deferReply: true,
    ephemeral: true,
    async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient, Discord: typeof import("discord.js")) {
        try {
            const code = interaction.options.get("code").value as string;

            // Check if the code exists
            const drop: CodeDrop = client.drops.get(code);

            if(!drop) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} That code does not exist.`)

                await interaction.editReply({ embeds: [error] });
                return;
            }

            if(drop.claimed) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} \`${code}\` has already been claimed.`)

                await interaction.editReply({ embeds: [error] });
                return;
            }

            const claiming = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`${emoji.ping} Claiming code...`)

            await interaction.editReply({ embeds: [claiming] });

            // Set the code as claimed
            drop.claimed = true;

            // Update the code drop
            client.drops.set(code, drop);

            // Give the user credits
            const user = await User.findOne({ _id: interaction.user.id });

            if(!user) {
                await new User({
                    _id: interaction.user.id,
                    credit_amount: drop.credits,
                    credit_used: 0
                }).save()
            } else {
                user.credit_amount += drop.credits;

                await user.save();
            }
            
            const member = interaction.guild.members.cache.get(interaction.user.id);

            if(!member.roles.cache.has(client.config_roles.donator)) await member.roles.add(client.config_roles.donator);

            // Update the code drop message
            const channel = interaction.guild.channels.cache.get(drop.channel) as TextChannel;
            const msg = await channel.messages.fetch(drop.message);

            const claimedEmbed = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setTitle("Claimed")
                .setDescription(`🎉 This code has been claimed by ${interaction.user}!`)
                .setTimestamp()

            await msg.edit({ embeds: [...msg.embeds, claimedEmbed] });

            // Send message in the donator channel
            const donatorChannel = interaction.guild.channels.cache.get(client.config_channels.donations) as TextChannel;

            const claimedDonator = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`🎉 ${interaction.user} claimed \`${code}\` for **${formatCurrency(drop.credits)}** of credit!`)

            await donatorChannel.send({ embeds: [claimedDonator] });

            const claimed = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setDescription(`${emoji.tick} You have claimed \`${code}\` for **${formatCurrency(drop.credits)}** of credit!`)

            await interaction.editReply({ embeds: [claimed] });
        } catch(err) {
            client.logCommandError(err, interaction, Discord);
        }
    }
}

export = command;

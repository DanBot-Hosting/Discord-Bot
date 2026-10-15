import Command from "../../classes/Command";
import ExtendedClient from "../../classes/ExtendedClient";
import { AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";

import { emojis as emoji } from "../../config";
import { FaqEntry, getCachedFaqEntries, getFaqEntries, getFaqTitle, searchFaq } from "../../util/docs-faq";

// Fetch the FAQs on startup so autocomplete is instant
getFaqEntries().catch(() => {});

const command: Command = {
    name: "faq",
    description: "Frequently asked questions from docs.danbot.host.",
    options: [
        {
            type: 3,
            name: "question",
            description: "The question to get an answer for.",
            required: true,
            autocomplete: true
        },

        {
            type: 6,
            name: "user",
            description: "A user to mention with the answer.",
            required: false
        }
    ],
    default_member_permissions: null,
    botPermissions: [],
    requiredRoles: [],
    cooldown: 5,
    enabled: true,
    // Replies directly instead of deferring, as mentions added by editing a deferred reply don't notify the user
    deferReply: false,
    ephemeral: false,
    async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient, Discord: typeof import("discord.js")) {
        try {
            const question = interaction.options.getString("question");
            const user = interaction.options.getUser("user");

            let entries = getCachedFaqEntries();

            if(entries.length) {
                // Refresh stale FAQs in the background
                getFaqEntries().catch(() => {});
            } else {
                // Nothing cached yet, so the fetch could take longer than Discord's 3 second reply limit
                await interaction.deferReply();

                try {
                    entries = await getFaqEntries();
                } catch(err) {
                    client.sentry.captureException(err);

                    const error = new Discord.EmbedBuilder()
                        .setColor(client.config_embeds.error)
                        .setDescription(`${emoji.cross} Unable to load the FAQs from the documentation right now. You can view them at https://docs.danbot.host/faq/`)

                    await interaction.editReply({ embeds: [error] });
                    return;
                }
            }

            // Autocomplete returns an ID, but fall back to searching if the user typed their own text
            const entry = entries.find(entry => entry.id === question) ?? searchFaq(entries, question)[0];

            if(!entry) {
                const error = new Discord.EmbedBuilder()
                    .setColor(client.config_embeds.error)
                    .setDescription(`${emoji.cross} No FAQ matched that question. You can view all FAQs at https://docs.danbot.host/faq/`)

                interaction.deferred ? await interaction.editReply({ embeds: [error] }) : await interaction.reply({ embeds: [error], flags: Discord.MessageFlags.Ephemeral });
                return;
            }

            const readMore = `\n\n**[Read more on the docs](${entry.url})**`;

            const response = new Discord.EmbedBuilder()
                .setColor(client.config_embeds.default)
                .setTitle(getFaqTitle(entry).slice(0, 256))
                .setURL(entry.url)
                .setDescription(entry.answer.length > 4096 ? entry.answer.slice(0, 4096 - readMore.length - 1) + "…" + readMore : entry.answer)
                .setFooter({ text: `${entry.source.label} FAQ • ${entry.category} • docs.danbot.host` })

            const buttons: any = new Discord.ActionRowBuilder()
                .addComponents (
                    new Discord.ButtonBuilder()
                        .setStyle(Discord.ButtonStyle.Link)
                        .setEmoji("📖")
                        .setLabel("View on Docs")
                        .setURL(entry.url)
                )

            const message = {
                content: user ? `${user}` : undefined,
                embeds: [response],
                components: [buttons],
                // Only allow the selected user to be pinged
                allowedMentions: { users: user ? [user.id] : [] }
            }

            interaction.deferred ? await interaction.editReply(message) : await interaction.reply(message);
        } catch(err) {
            client.logCommandError(err, interaction, Discord);
        }
    },
    async autocomplete(interaction: AutocompleteInteraction, client: ExtendedClient) {
        const option = interaction.options.getFocused(true);

        if(option.name === "question") {
            let entries = getCachedFaqEntries();

            // Autocomplete must respond within 3 seconds, so only wait on a fetch if nothing is cached yet
            if(!entries.length) {
                entries = await Promise.race([
                    getFaqEntries().catch((): FaqEntry[] => []),
                    new Promise<FaqEntry[]>(resolve => setTimeout(() => resolve([]), 2000))
                ])
            } else {
                // Refresh stale FAQs in the background
                getFaqEntries().catch(() => {});
            }

            const choices = searchFaq(entries, option.value)
                .slice(0, 25)
                .map(entry => {
                    const name = entry.source.key === "general" ? getFaqTitle(entry) : `[${entry.source.label}] ${getFaqTitle(entry)}`;

                    return {
                        name: name.length > 100 ? name.slice(0, 99) + "…" : name,
                        value: entry.id
                    }
                })

            await interaction.respond(choices);
        }
    }
}

export = command;

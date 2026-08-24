require("dotenv").config({ quiet: true });

import * as Sentry from "@sentry/node";

Sentry.init({
    dsn: process.env.sentry_dsn,
    tracesSampleRate: 1.0
})

import Discord from "discord.js";
import ExtendedClient from "./classes/ExtendedClient";
import config from "./config";

const client = new ExtendedClient({
    intents: 3276799,
    partials: [
        Discord.Partials.Channel,
        Discord.Partials.GuildMember,
        Discord.Partials.GuildScheduledEvent,
        Discord.Partials.Message,
        Discord.Partials.Reaction,
        Discord.Partials.ThreadMember,
        Discord.Partials.User
    ],
    presence: {
        activities: [
            {
                name: "🌐 panel.danbot.host",
                type: Discord.ActivityType.Custom
            }
        ],
        status: "online"
    }
})

// Error Handling
process.on("unhandledRejection", (err: Error) => Sentry.captureException(err));

// Connect to Database
import database from "./util/database";
database();

// Configs
client.config_categories = config.categories;
client.config_channels = config.channels;
client.config_embeds = config.embeds;
client.config_main = config.main;
client.config_roles = config.roles;

// Handlers
client.buttons = new Discord.Collection();
client.commands = new Discord.Collection();
client.events = new Discord.Collection();
client.keywords = new Discord.Collection();
client.legacyCommands = new Discord.Collection();

import { loadHandlers } from "./util/functions";
loadHandlers(client);

// Login
client.login(process.env.token);

// Constants
client.allowJoining = true;
client.autoKick = true;
client.commandIds = new Discord.Collection();
client.credit = require("./util/credit");
client.drops = new Discord.Collection();
client.sentry = Sentry;

client.validPermissions = [
    "CreateInstantInvite",
    "KickMembers",
    "BanMembers",
    "Administrator",
    "ManageChannels",
    "ManageGuild",
    "AddReactions",
    "ViewAuditLog",
    "PrioritySpeaker",
    "Stream",
    "ViewChannel",
    "SendMessages",
    "SendTTSMessages",
    "ManageMessages",
    "EmbedLinks",
    "AttachFiles",
    "ReadMessageHistory",
    "MentionEveryone",
    "UseExternalEmojis",
    "ViewGuildInsights",
    "Connect",
    "Speak",
    "MuteMembers",
    "DeafenMembers",
    "MoveMembers",
    "UseVAD",
    "ChangeNickname",
    "ManageNicknames",
    "ManageRoles",
    "ManageWebhooks",
    "ManageEmojisAndStickers",
    "UseApplicationCommands",
    "RequestToSpeak",
    "ManageEvents",
    "ManageThreads",
    "CreatePublicThreads",
    "CreatePrivateThreads",
    "UseExternalStickers",
    "SendMessagesInThreads",
    "UseEmbeddedActivities",
    "ModerateMembers",
    "ViewCreatorMonetizationAnalytics",
    "UseSoundboard",
    "SendVoiceMessages"
]

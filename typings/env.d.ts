import { Snowflake } from "discord.js";

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            bot_api_master_key: string;
            clientId: Snowflake;
            database?: string;
            panel_application_api_key: string;
            sentry_dsn: string;
            token: string;
        }
    }
}

export {};

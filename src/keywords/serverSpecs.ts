import Keyword from "../classes/Keyword";

const keyword: Keyword = {
    title: "What are the server specs?",
    keywords: ["what", "are", "the", "server", "specs", "spec", "specifications"],
    requiredKeywords: ["server", "specs", "specs","specifications"],
    response: `**__Free Nodes__**
    \n- **Pnode-1:** \`N/A\`
    \n- **Pnode-2:** \`N/A\`
    \n- **Pnode-3:** \`N/A\`
    \n\n**__Premium Nodes__**
    \n__Node | CPU | RAM | SSD | Network__
    \n- **Dono-1:** \`32 Cores, 64 Threads | 128GB | 2TB | 1Gbps up/down | GPU: No\`
    \n- **Dono-2:** \`6 Cores, 12 Threads  | 128GB | 2TB | 1Gbps up/down | GPU: No\`
    \n- **Dono-3:** \`6 Cores, 12 Threads  | 128GB | 2TB | 1Gbps up/down | GPU: No\`
    \n- **Dono-4:** \`6 Cores, 12 Threads  | 128GB | 2TB | 1Gbps up/down | GPU: No\`
    \n- **Dono-5:** \`12 Cores, 24 Threads | 128GB | 2TB | 1Gbps up/down | GPU: Yes\`
    \n\n**__VPS Nodes__**
    \n- **US-1:** \`16 Cores, 32 Threads   | 128GB| 2TB | 1Gbps up/down\`
    \n- **US-2:** \`16 Cores, 32 Threads   | 96GB | 1TB | 2.5Gbps up/down\`
    \n- **UK-1:** \`12 Cores\ 24 Threads   | 64GB | 2TB | 1Gbps up/down\``,
    minimumKeywords: 3,
    matchAll: false,
    enabled: true
}

export = keyword;

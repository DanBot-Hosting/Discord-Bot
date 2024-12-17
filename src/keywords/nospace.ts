import Keyword from "../classes/Keyword";

const keyword: Keyword = {
    title: "I\'m getting a \"No Space\" error when trying to use the hosting. How do i fix it?",
    keywords: ["no", "space", "error", "server", "disk", "fix"],
    requiredKeywords: ["no", "space"],
    response: `When installing a package, it creates a temporary directory for installing on the host server. 
    \nThis directory is limited to 100MB in size. So packages bigger than 100MB will fail to install and give out of space error.
    \n\nIf your server support bash command (aio,python etc) run this:\n 
    \`mkdir /home/container/tmp && export TMPDIR=/home/container/tmp\``,
    minimumKeywords: 3,
    matchAll: false,
    enabled: true
}

export = keyword;

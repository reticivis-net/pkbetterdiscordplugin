/// <reference types="zerespluginlibrarytypings"/>

module.exports = (Plugin: typeof BasePlugin, Library: typeof PluginLibrary) => {

    const {Logger, Patcher, WebpackModules} = Library;

    return class PKBD extends Plugin {
        constructor() {
            super();
        }

        onStart() {
            Logger.log("Started");
            debugger
            const BotTag = WebpackModules.getByProps("BotTagTypes");
            const BotTagTypes = BotTag.default.Types || BotTag.BotTagTypes;
            // const MessagePack = WebpackModules.getByProps("BaseMessageHeader")
            const MessagePack = BdApi.findModule(m => m?.default?.toString().indexOf("showTimestampOnHover") > -1);
            Logger.log(BotTag, BotTagTypes, MessagePack, Patcher)
            Patcher.instead(BotTag, "default", ((args) => {
                console.log(args)
                return "BALLSBALLSBALLS"
            }))
        }

        onStop() {
            Logger.log("Stopped");
            Patcher.unpatchAll();
        }
    }
}
/// <reference types="zerespluginlibrarytypings"/>

module.exports = (BasePlugin, Library: typeof ZLibrary) => {

    const {Logger} = Library;

    return class PKBD extends BasePlugin {
        constructor() {
            super();
        }

        onStart() {
            Logger.log("Started");
        }

        onStop() {
            Logger.log("Stopped");
        }
    }
}
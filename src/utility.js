// stuff i used during development of the lib, maybe helpful to anyone purusing?

function findmoduleofclass(classname) {
    return ZeresPluginLibrary.WebpackModules.findAll(m => {
        const l = Object.values(m).some(j => j.includes(classname))
        // if (l) console.log(m);
        return l
    })
}

/// <reference types="zerespluginlibrarytypings"/>


// if anyone is looking at this code for examples of the typings, ill be honest,
// im not entirely sure how to write this in JS or if this even the best way to do it in TS
// but webstorm and tsc are fine with it
module.exports = (Plugin: typeof BasePlugin, Library: typeof PluginLibrary) => {
    const {Logger, Patcher, WebpackModules, Utilities} = Library;
    const {React, ReactDOM} = BdApi;

    // react internal classes are distributed over a bunch of webpack modules
    // get on initialization cause they take a fair bit to get cause theres like idk 8k modules?
    const popoutClasses = WebpackModules.getByProps("userPopout");
    const bannerClasses = WebpackModules.getByProps("banner");
    const popoutStyleClasses = WebpackModules.getByProps("aboutMeTitle");
    const wrapperClasses = WebpackModules.getByProps("avatarStack");
    const sizeClasses = WebpackModules.getByProps("size10");
    const textClasses = WebpackModules.getByProps("uppercase");
    const nameTagClasses = WebpackModules.getByProps("nameTag", "username", "bot");
    const scrollerClasses = WebpackModules.getByProps("thin");
    const markupClasses = WebpackModules.getByProps("markup");
    const clamped = WebpackModules.getByProps("clamped").clamped;
    const ProfileModals = WebpackModules.getByProps("openUserProfileModal");
    const sleep = (ms: number) => {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
    return class PKBD extends Plugin {
        constructor() {
            super();
        }

        // iirc the PK dev said this isnt actually implemented but it's good practice and futureproofing
        // my testing concludes that the API has some undocumented ratelimit so its better to stick with the official
        bucket_drip_capacity = 2
        bucket_drip_rate = 1
        bucket: any[] = []

        plugin_active = false

        async bucketdrip() {
            // running in background
            while (this.plugin_active) {
                // take the first n (bucket_drip_capacity) promises and resolve them which unblocks them
                this.bucket
                    // newer messages drip first
                    .sort(function (a, b) {
                        return b.priority - a.priority;
                    })
                    .slice(0, this.bucket_drip_capacity).forEach((m) => {
                    m.resolve();
                })
                // remove them from the list
                this.bucket = this.bucket.slice(2);
                // wait
                await sleep(this.bucket_drip_rate * 1000)
            }
        }

        async waitforbucket(priority = 0) {
            // js this my behated
            let tbucket = this.bucket;
            // create a promise and give its resolve func to the bucket
            let p = new Promise(function (resolve, reject) {
                tbucket.push({resolve: resolve, reject: reject, priority: priority});
            });
            // the bucket will call the resolve func when ready
            return await p;
        }

        baseurl = "https://api.pluralkit.me/v2" // ${this.baseurl}/messages/${messageid}`

        async pkapirequest(endpoint: string, priority: number) {
            // wait for ratelimit to be safe
            await this.waitforbucket(priority)
            // fetch and return
            const response = await fetch(`${this.baseurl}/${endpoint}`)
            if (response.ok) {
                return await response.json()
            } else {
                if (response.status === 404) {
                    return undefined
                } else {
                    Logger.err(`PK server responded with status ${response.status}`, await response.text())
                    throw new Error(`PK server responded with status ${response.status}`);
                }
            }
        }

        cacherequest(endpoint: string) {
            if (Object.keys(this.livecache).includes(endpoint) &&  // object exists in cache
                Date.now() - (this.livecache[endpoint]["added"] as Date).getTime() < 1000 * 60 * 60 * 24) {  // cache is younger than a day
                return this.livecache[endpoint]["object"]  // return cached object
            } else {  // fetch new data and cache
                return undefined
            }
        }

        async pkapireqcache(endpoint: string, priority: number) {
            let cached = this.cacherequest(endpoint)
            if (cached) {
                return cached
            } else {  // fetch new data and cache
                const data = await this.pkapirequest(endpoint, priority)
                this.livecache[endpoint] = {"object": data, "added": new Date()};
                return data;
            }
        }

        async pkmessagedata(messageid: string | number) {
            // using ID as priority causes newer messages to be fetched first which is almost always desired behavior
            // minus 1e19 makes it so everything else has bigger priority
            return await this.pkapireqcache(`messages/${messageid}`,
                (typeof messageid === "string" ? parseFloat(messageid) : messageid) - 1e19)
        }

        async pkmemberdata(memberref: string) {
            return await this.pkapireqcache(`members/${memberref}`, 0)
        }

        async pksystemdata(systemref: string) {
            return await this.pkapireqcache(`systems/${systemref}`, 0)
        }


        PKPopout(membername: string, membercolor: string, memberavatar: string, systemname: string, memberdescription: string, accountid: string | number, guildid: string | number) {

            // opens acc modal dynamically, praise allah its so easy
            function openmodal() {
                ProfileModals.openUserProfileModal(
                    {
                        userId: accountid.toString(),
                        guildId: guildid.toString(),
                        analyticsLocation: {
                            "section": "Profile Popout"
                        }
                    })
            }

            // take PK data and make nice looking popout
            // modified version of the user popout, dynamically inject react classes
            // yes i could create the react elemetns but its just a pain
            return <div aria-label={membername} className={popoutClasses.userPopout} role="dialog" tabIndex={-1}
                        aria-modal="true"
                        style={{width: '300px'}}>
                <div className={popoutClasses.headerNormal}>
                    <div className={`${bannerClasses.banner} ${bannerClasses.popoutBanner}`}
                         style={{backgroundColor: '#' + membercolor}}/>
                </div>
                <div
                    className={`${popoutStyleClasses.avatarWrapperNormal} ${popoutStyleClasses.avatarWrapper} ${popoutStyleClasses.avatarPositionNormal} ${popoutStyleClasses.clickable}`}
                    role="button" tabIndex={0}>
                    <div className={popoutStyleClasses.avatarHoverTarget} onClickCapture={openmodal}>
                        <div className={`${popoutStyleClasses.avatar} ${wrapperClasses.wrapper}`}
                             role="img" aria-label={membername}
                             aria-hidden="false"
                             style={{width: '80px', height: '80px'}}>
                            <svg width="92" height="80" viewBox="0 0 92 80"
                                 className={`${wrapperClasses.mask} ${wrapperClasses.svg}`}
                                 aria-hidden="true">
                                <mask id="pk-popout-avatar-mask" width="80" height="80">
                                    <circle cx="40" cy="40" r="40" fill="white"/>
                                </mask>
                                <foreignObject mask="url(#pk-popout-avatar-mask)" height="80"
                                               width="80" y="0" x="0">
                                    <div className={wrapperClasses.avatarStack}><img
                                        src={memberavatar}
                                        alt=" " className={wrapperClasses.avatar} aria-hidden="true"/></div>
                                </foreignObject>
                                <rect x="60" y="60" width="16" height="16" fill="transparent" aria-hidden="true"
                                      className={wrapperClasses.pointerEvents}/>
                            </svg>
                        </div>
                    </div>
                    <svg width="80" height="80" className={popoutStyleClasses.avatarHint} viewBox="0 0 80 80">
                        <foreignObject x="0" y="0" width="80" height="80" overflow="visible"
                                       mask="url(#pk-popout-avatar-mask)">
                            <div className={popoutStyleClasses.avatarHintInner}>View Account</div>
                        </foreignObject>
                    </svg>
                </div>
                <div className={popoutStyleClasses.headerTop} style={{paddingTop: '56px'}}>
                    <div className={popoutStyleClasses.headerText}>
                        <h3 className={`${popoutStyleClasses.nickname} ${textClasses.base} ${sizeClasses.size20}`}>
                            {membername}
                        </h3>
                        <div className={`${popoutStyleClasses.headerTagWithNickname} ${nameTagClasses.nameTag}`}>
                            <span className={`${nameTagClasses.username} ${popoutStyleClasses.headerTagUsernameBase}`}>
                                {systemname}
                            </span>
                        </div>
                    </div>
                </div>
                <div className={`${popoutClasses.body} ${scrollerClasses.thin} ${scrollerClasses.scrollerBase}`}
                     dir="ltr"
                     style={{overflow: 'hidden scroll', paddingRight: '8px'}}>
                    <div className={popoutStyleClasses.divider}/>
                    <div className={popoutStyleClasses.aboutMeSection} style={{marginBottom: '0'}}>
                        <h3 className={`${popoutStyleClasses.aboutMeTitle} ${textClasses.base} ${sizeClasses.size12} ${textClasses.muted} ${textClasses.uppercase}`}>
                            About Me
                        </h3>
                        <div className={`${popoutStyleClasses.aboutMeBody} ${markupClasses.markup} ${clamped}`}>
                            {memberdescription}
                        </div>
                    </div>
                </div>
            </div>
        }

        livecache = {}

        onStart() {
            // start the bucket, the check should stop the thing from running twice
            if (!this.plugin_active) {
                this.plugin_active = true
                this.bucketdrip()
            }
            const MessagePack = WebpackModules.getByProps("BaseMessageHeader");

            const RepliedMessage = WebpackModules.getModule(m => m.default.displayName === "RepliedMessage");
            Patcher.after(MessagePack, "default", (thisObject, args, returnValue) => {
                let pkmemberdata = {};
                const auth = returnValue.props.message.author;
                const webhook = auth.bot && auth.discriminator === "0000" && !auth.system && !auth.verified;
                if (webhook) {
                    // override popup
                    const origpopout = returnValue.props.avatar.props.renderPopout.bind({});
                    const renderPopout = (...pargs) => {
                        if (Object.keys(pkmemberdata).length > 0) {
                            return this.PKPopout(pkmemberdata['display_name'] || pkmemberdata['name'],
                                pkmemberdata['color'] || 'fff',
                                pkmemberdata['avatar_url'] || "https://cdn.discordapp.com/embed/avatars/0.png",
                                pkmemberdata["systemname"], pkmemberdata['description'] || "No description",
                                pkmemberdata["accid"], args[0].guildId);
                        } else {
                            return origpopout(...pargs)
                        }
                    }

                    // for now i have to patch the rendering as it's done cause idk how to modify existing react elements nor make new ones sadly
                    returnValue.props.avatar.props.renderPopout = renderPopout
                    returnValue.props.username.props.children[1].props.children[0].props.renderPopout = renderPopout;

                    this.pkmessagedata(returnValue.props.message.id).then(r => {
                        // make sure no unneeded edits are made
                        if (r === undefined) return
                        // add member to cache

                        // fetch member info for popup
                        this.pkmemberdata(r.member.uuid).then(m => {
                            this.pksystemdata(r.system.uuid).then(s => {
                                m["accid"] = r.sender;
                                m["systemname"] = s.name
                                pkmemberdata = m;
                            })

                        })
                        // HTML element, react is annoying to work with
                        let header = document.getElementById(`message-username-${returnValue.props.message.id}`);
                        if (!header) return
                        if (header.hasAttribute("PKBDedited")) return
                        let usernameelem = (header.children[0] as HTMLElement);
                        let servernick;
                        // server display names aren't sent for some god forsaken reason so we do a wee bit of parsing
                        // try to cut out the tag from the name
                        if (r.system.tag) {
                            if (usernameelem.innerText.endsWith(r.system.tag)) {
                                servernick = usernameelem.innerText.slice(0, usernameelem.innerText.length - r.system.tag.length)
                            } else {  // default to global display name if tag fails somehow, shouldnt ideally
                                servernick = r.member.display_name || r.member.name
                            }
                        } else {  // no cutting needed if there is no tag, just use the text
                            servernick = usernameelem.innerText;
                        }
                        // edit username appearance
                        usernameelem.innerHTML = `${servernick} <span style="color: #${r.system.color || 'fff'}">${r.system.tag || ""}</span>`;
                        // underline isnt colored if i dont do it like this sadly
                        usernameelem.style.color = "#" + (r.member.color || 'fff');
                        (header.children[1] as HTMLElement).firstElementChild.innerHTML = "PK";
                        // prevent unneeded re-editing which can cause unexpected behavior
                        header.setAttribute("PKBDedited", "")
                    })
                }
            })

        }

        onStop() {
            Logger.log("Stopped");
            Patcher.unpatchAll();
            this.plugin_active = false
        }
    }
}
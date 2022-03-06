/// <reference types="zerespluginlibrarytypings"/>


// if anyone is looking at this code for examples of the typings, ill be honest,
// im not entirely sure how to write this in JS or if this even the best way to do it in TS
// but webstorm and tsc are fine with it
module.exports = (Plugin: typeof BasePlugin, Library: typeof PluginLibrary) => {
    const {Logger, Patcher, WebpackModules} = Library;
    const {React} = BdApi;

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
                this.bucket.slice(0, this.bucket_drip_capacity).forEach((m) => {
                    m.resolve();
                })
                // remove them from the list
                this.bucket = this.bucket.slice(2);
                // wait
                await sleep(this.bucket_drip_rate * 1000)
            }
        }

        async waitforbucket() {
            // js this my behated
            let tbucket = this.bucket;
            // create a promise and give its resolve func to the bucket
            let p = new Promise(function (resolve, reject) {
                tbucket.push({resolve: resolve, reject: reject});
            });
            // the bucket will call the resolve func when ready
            return await p;
        }

        baseurl = "https://api.pluralkit.me/v2"

        async pkapirequestmessage(messageid: string | number) {
            // wait for ratelimit to be safe
            await this.waitforbucket()
            // fetch and respond

            const response = await fetch(`${this.baseurl}/messages/${messageid}`)
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

        PKPopout(membername: string, membercolor: string, memberavatar: string, systemname: string, memberdescription: string, accountid: string | number) {
            // take PK data and make nice looking popout
            // modified version of the user popout, dynamically inject react classes

            // TODO: make "view profile" link to profile
            return <div aria-label={membername} className={popoutClasses.userPopout} role="dialog" tabIndex={-1}
                        aria-modal="true"
                        style={{width: '300px'}}>
                <div className={popoutClasses.headerNormal}>
                    <div className={`${bannerClasses.banner} ${bannerClasses.popoutBanner}`}
                         style={{backgroundColor: membercolor}}/>
                </div>
                <div
                    className={`${popoutStyleClasses.avatarWrapperNormal} ${popoutStyleClasses.avatarWrapper} ${popoutStyleClasses.avatarPositionNormal} ${popoutStyleClasses.clickable}`}
                    role="button" tabIndex={0}>
                    <div className={popoutStyleClasses.avatarHoverTarget}>
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

        onStart() {
            // start the bucket, the check should stop the thing from running twice
            if (!this.plugin_active) {
                this.plugin_active = true
                this.bucketdrip()
            }
            const BotTag = WebpackModules.getByProps("BotTagTypes");
            const BotTagTypes = BotTag.default.Types || BotTag.BotTagTypes;
            const MessagePack = WebpackModules.getByProps("BaseMessageHeader")
            Patcher.after(MessagePack, "default", ((thisObject, args, returnValue) => {
                const auth = returnValue.props.message.author;
                const webhook = auth.bot && auth.discriminator === "0000" && !auth.system && !auth.verified;
                if (webhook) {
                    // override popup
                    const renderPopout = () => {
                        return this.PKPopout("member name", "#ff00ff",
                            "https://www.guinnessworldrecords.com/Images/finley%202_tcm25-620066.jpg",
                            "system name", "member desc", "0");
                    }

                    returnValue.props.avatar.props.renderPopout = renderPopout
                    returnValue.props.username.props.children[1].props.children[0].props.renderPopout = renderPopout;
                    // returnValue.props.username.props.children[1].props.children[0].props.author.nick = "banger"
                    this.pkapirequestmessage(returnValue.props.message.id).then(r => {
                        // discord oh so kindly gives us an HTML id.
                        // once we get to this callback, returnValue is no longer able to modify anything so we gotta refetch from the page
                        // @ts-ignore
                        let usernameprops = document.getElementById(returnValue.props.usernameSpanId).__reactFiber$.memoizedProps.children.props.children[1].props.children[0].props;
                        if (r.member.color) {
                            usernameprops.author.colorString = `#${r.member.color}`;
                        } else {
                            usernameprops.author.colorString = "#ff0000"
                        }
                    })
                }
            }))
        }

        onStop() {
            Logger.log("Stopped");
            Patcher.unpatchAll();
            this.plugin_active = false
        }
    }
}
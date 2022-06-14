require('dotenv').config()
const axios = require('axios').default;
const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const SteamStore = require('steamstore');
const EventEmitter = require('eventemitter3');
const gameList = require('./gameList');
const log = require('./log');

module.exports = function(accountData){
    this.hours = 100;
    this.eventHandler = new EventEmitter();
    this.client = new SteamUser();
    this.community = new SteamCommunity();
    this.store = new SteamStore({
        "timeout": 30000
    });
    this.logOnOptions = {
        accountName: accountData.login,
        password: accountData.password,
        rememberPassword: true,
        machineName: 'The M. Idle Service | Machine #001',
        clientOS: 20,
        dontRememberMachine: false
    }
    let gameListed = []; gameListed.push(`The M. Idle`);
    gameList.forEach((game) => gameListed.push(game));
    this.games = gameListed;
    this.client.logOn(this.logOnOptions);
    this.client.on('loggedOn', (details, parental) => {
        this.eventHandler.emit('loggedIn', this.logOnOptions.accountName);
        this.steamID64 = details.client_supplied_steamid;
        this.vanityUrl = details.vanity_url;
        this.client.setPersona(1);
        this.client.gamesPlayed(this.games, true);
    });
    this.client.on('error', (err) => {
        if (err == "Error: RateLimitExceeded") {
            log(`Error happened! Error: RateLimitExceeded`, login, true);
        } else if (err == "Error: LoggedInElsewhere") {
            log(`Error happened! Error: LoggedInElsewhere`, login, true);
            this.restart();
        } else {
            log(`Error happened! Error code: ${err.eresult}`, login, true);
            this.restart();
        }
    });
    this.client.on('friendRelationship', async (steamID, relationship) => {
        if (relationship === 2) {
            this.eventHandler.emit('newFriendInvite', this.logOnOptions.accountName, steamID);
            log(`New friend request. [${steamID}]`, accountData.login)
            this.client.addFriend(steamID);
            this.client.chatMessage(steamID, `Thank you for adding me to your friendlist! \nI'm idling hours using The M. Idle service!\n https://discord.gg/t3xxnCfd3k`);
        }
    });
    this.client.on('groupRelationship', async (steamID, relationship) => {
        if (relationship === 2){
            this.eventHandler.emit('newGroupInvite', this.logOnOptions.accountName, steamID);
            log(`New group join request. [${steamID}]`, accountData.login)
            this.client.respondToGroupInvite(steamID, true);
        }
    });
    this.client.on('webSession', (sessionid, cookies) => {
        this.eventHandler.emit('webSessionStarted', this.logOnOptions.accountName);
        this.community.setCookies(cookies);
        this.store.setCookies(cookies);
        this.community.setupProfile();
        this.community.editProfile({
            name: `HourBoost | The M. Idle`,
            realName: 'The M.#6175',
            summary: `[b]I'm idling hours using The M. Idle service![/b]`,
            country: 'PL',
            customURL: `${accountData.login}`
        }, (err) => { if(err) return log(`Error: ${err}`) })
        this.community.clearPersonaNameHistory();
        this.community.profileSettings({
            profile: 3,
            comments: 3,
            inventory: 3,
            inventoryGifts: false,
            gameDetails: 3,
            playtime: false,
            friendsList: 3
        })
        setTimeout(() => {
            this.games.forEach((game) => { this.store.addFreeLicense(game, (err) => { if(err) return log(`Error: ${err}`, accountData.login); }) })
        }, 10000)
        // setTimeout(() => {
        //     this.community.editProfile({
        //         description: `[b]I'm idling hours using The M. Idle service![/b]`
        //     }, (err) => {
        //         if(err) return log(`Error happened while changing nickname and description. ${err}`, accountData.login);
        //         return log(`Successfully changed account description!`, accountData.login);
        //     })
        // }, 5000)
    });
    this.relogin = function(){ this.client.relog(); };
    this.restart = function(){ setTimeout(() => { this.client.relog(); })};
    this.checkHours = async function(){
        const hours = this.hours;
        const data = await axios.get(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAMAPIKEY}&steamid=${this.steamID64}&format=json`)
            .then(function (response) {
                response.data.response.games.forEach((game) => {
                    if(game.appid == '730'){
                        let hoursPlayed = game.playtime_forever/60;
                        let hoursPlayedWeeks = game.playtime_2weeks/60;
                        log(`Hours checked! Account has ${hoursPlayed.toFixed(1)}/${hours} (${hoursPlayedWeeks.toFixed(1)} in last 2 weeks) hours in CS:GO!`, accountData.login)
                        this.hoursPlayed = hoursPlayed;
                        this.hoursPlayedWeeks = hoursPlayedWeeks;
                    } else {
                        log(`Skipping ${game.appid}`)
                    }
                })
            })
            .catch(function (error) { console.log(error); })
    }
    this.checkHoursInterval = function(){
        setInterval(async () => {
            const hours = await axios.get(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAMAPIKEY}&steamid=${this.steamID64}&format=json`)
            .then(function (response) { console.log(response); response.data.response.games.forEach((game) => {
                if(game.appid === '730') return console.log(game.playtime_forever)
            }) })
            .catch(function (error) { console.log(error); })
            if(hours>this.hours){
                this.client.logOff();
            } else {
                log(`Hours checked! Account has ${hours}/${this.hours} hours in CS:GO!`)
            }
        }, 1800000)
    }
}
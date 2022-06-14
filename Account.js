require('dotenv').config()
const axios = require('axios').default;
const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const EventEmitter = require('eventemitter3');
const gameList = require('./gameList');
const log = require('./log');

module.exports = function(accountData){
    this.hours = 100;
    this.eventHandler = new EventEmitter();
    this.client = new SteamUser();
    this.community = new SteamCommunity();
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
        this.client.setPersona(1, `HourBoost | The M. Idle`);
        this.client.gamesPlayed(this.games, true);
        this.games.forEach((game) => { this.client.requestFreeLicense(game, (err) => { if(err) return log(`Error: ${err}`, { account: login }); }) })
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
    this.client.on('friendRelationship', async (steamid, relationship) => {
        if (relationship === 2) {
            this.eventHandler.emit('newFriendInvite', this.logOnOptions.accountName);
            log(`New friend request. [${steamid}]`, { account: login })
            this.client.addFriend(steamid);
            this.client.chatMessage(steamid, `Thank you for adding me to your friendlist! \nI'm idling hours using The M. Idle service!\n https://discord.gg/t3xxnCfd3k`);
        }
    });
    this.client.on('webSession', (sessionid, cookies) => {
        this.eventHandler.emit('webSessionStarted', this.logOnOptions.accountName);
        this.community.setCookies(cookies);
        setTimeout(() => {
            this.community.editProfile({
                description: `I'm idling hours using [url="https://discord.gg/t3xxnCfd3k"]The M. Idle[/url] service![/b]`
            }, (err) => {
                if(err) return log(`Error happened while changing nickname and description. ${err}`, { account: login });
                return log(`Successfully changed account description!`, { account: login });
            })
        }, 5000)
    });
    this.relogin = function(){ this.client.relog(); };
    this.restart = function(){ setTimeout(() => { this.client.relog(); })};
    this.checkHours = async function(){
        const res = await axios.get(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAMAPIKEY}&steamid=${this.steamID64}&format=json`)
            .then(function (response) { response.data.response.games.forEach((game) => {
                if(game.appid === '730') return console.log(game.playtime_forever)
            }) })
            .catch(function (error) { console.log(error); })
        return res;
    }
    this.checkHoursInterval = function(){
        setInterval(async () => {
            const hours = await this.checkHours();
            if(hours>this.hours){
                this.client.logOff();
            } else {
                log(`Hours checked! Account has ${hours}/${this.hours} hours in CS:GO!`)
            }
        }, 1800000)
    }
}
const axios = require('axios').default;
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const EventEmitter = require('eventemitter3');
const gameList = require('./gameList');
const log = require('./log');

module.exports = function(accountData){
    this.eventHandler = new EventEmitter();
    this.client = new SteamUser();
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
    this.client.on('loggedOn', () => {
        this.eventHandler.emit('loggedIn', this.logOnOptions.accountName);
        this.client.setPersona(1, `Hours | The M. Idle`);
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
    this.relogin = function(){ this.client.relog(); };
    this.restart = function(){ setTimeout(() => { this.client.relog(); })};
    this.checkHours = function(){
        axios.get(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${this.steamID64}&format=json`)
            .then(function (response) { response.data.response.games.forEach((game) => {
                if(game.appid === '730') console.log(game.playtime_forever)
            }) })
            .catch(function (error) { console.log(error); })
    }
}
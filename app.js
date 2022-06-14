const Account = require('./Account');
const accounts = [];
// accs.forEach((acc) => {
//     accounts.push(new Account({
//         login: acc.login,
//         password: acc.password
//     }))
// })

const acc = new Account({
    login: '1themidle',
    password: 'd*wFd~.6Pj'
})
acc.eventHandler.on('loggedIn', async (login) => {
    setTimeout(async () => {
        await acc.checkHours();
    }, 5000)
})
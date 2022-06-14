const Account = require('./Account');
const accounts = [];
accs.forEach((acc) => {
    accounts.push(new Account({
        login: acc.login,
        password: acc.password
    }))
})
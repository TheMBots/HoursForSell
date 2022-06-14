const dayjs = require('dayjs');
const colors = require('colors');

module.exports = async (text, module) => {
    const date = dayjs(Date.now()).format('DD/MM/YYYY HH:mm');
    return console.log(
        colors.yellow(date),
        colors.red.bold(module),
        colors.green(text)
    );
}